#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRaw, inflateRaw } from 'node:zlib';
import { promisify } from 'node:util';
import { unishox2_compress, unishox2_decompress, magic, USX_TEMPLATES } from 'unishox2.siara.cc';

const deflateRawP = promisify(deflateRaw);
const inflateRawP = promisify(inflateRaw);

// ============================================================
// Config
// ============================================================
const BASE_URL = 'http://127.0.0.1:8090';
const SECRET = 'test';
const PROMPT = 'What is the capital of France?';

// ============================================================
// Logging helpers
// ============================================================
const LOG_FILE = dirname(fileURLToPath(import.meta.url)) + '/stego_debug_legacy_log.txt';
writeFileSync(LOG_FILE, '', 'utf-8');

const LOG = {
  title: (s) => appendFileSync(LOG_FILE, `\n[${s}]\n`, 'utf-8'),
  step: (s) => appendFileSync(LOG_FILE, `\n[${s}]\n`, 'utf-8'),
  // req: (method, url, body) => appendFileSync(LOG_FILE, `\n>> ${method} ${url}\n${JSON.stringify(body)}\n`, 'utf-8'),
  // res: (data) => appendFileSync(LOG_FILE, `<< ${JSON.stringify(data)}\n`, 'utf-8'),
  val: (name, val) => appendFileSync(LOG_FILE, `  ${name} = ${_fmt(val)}\n`, 'utf-8'),
  raw: (s) => appendFileSync(LOG_FILE, s + '\n', 'utf-8'),
};

function _fmt(v) {
  if (v instanceof Uint8Array) return `Uint8Array(${v.length}) [${[...v].slice(0,20).join(',')}${v.length>20?'...':''}]`;
  if (Array.isArray(v)) return `[${v.join(',')}]`;
  if (typeof v === 'string' && v.length > 100) return v.slice(0, 100) + '...';
  return v;
}

// ============================================================
// HTTP helpers
// ============================================================
async function apiPost(path, body) {
  // LOG.req('POST', BASE_URL + path, body);
  const r = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HTTP ${r.status}: ${text}`);
  }
  const data = await r.json();
  // LOG.res(data);
  return data;
}

async function apiGet(path) {
  // LOG.req('GET', BASE_URL + path, null);
  const r = await fetch(BASE_URL + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  // LOG.res(data);
  return data;
}

// ============================================================
// Core algorithm functions (replicated from index.astro)
// ============================================================
function getWeight(code) {
  // Weight 1: must-keep chars (breaking severely breaks semantics)
  if (code === 32 || code === 44 || code === 46 ||
      (code >= 65 && code <= 90) || (code >= 97 && code <= 122))
    return 1;
  // Weight 2: prefer-keep chars
  if (code === 65292 || code === 12290 || code === 8221 || code === 30340)
    return 2;
  return 3;
}

function getParity(str) {
  const hash = createHash('sha512').update(str, 'utf-8').digest();
  let xorAll = 0;
  for (let i = 0; i < hash.length; i++) xorAll ^= hash[i];
  // popcount (Brian Kernighan)
  for (let c = 0; ; c++) {
    if (xorAll === 0) return c & 1;
    xorAll &= xorAll - 1;
  }
}

async function tokenize(str) {
  const r = await apiPost('/tokenize', { content: str });
  return r.tokens;
}

async function detokenize(tokens) {
  const r = await apiPost('/detokenize', { tokens });
  return r.content;
}

async function applyTemplate(messages) {
  const r = await apiPost('/apply-template', { messages });
  return r.prompt;
}

const magicNum1 = [1,0,1,1,0,0,1,0,0,1,1,0,0,1,1,0,1,0,1,1];
const magicNum2 = [0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,0];
const punctuations = ["？", "?", "！", "!", "。", "）", ")", "…", "}", "]", "."];

function toBinary(bytes) {
  return Array.from(bytes).flatMap(b =>
    Array.from({ length: 8 }, (_, i) => (b >> (7 - i)) & 1)
  );
}

function toBytes(bits) {
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  let k = 0;
  for (let i = 0; i < bits.length; i += 8) {
    bytes[k++] = (bits[i] << 7) | (bits[i+1] << 6) | (bits[i+2] << 5) |
                 (bits[i+3] << 4) | (bits[i+4] << 3) | (bits[i+5] << 2) |
                 (bits[i+6] << 1) | bits[i+7];
  }
  return bytes;
}

function findSublist(mainList, subList) {
  const sl = subList.length;
  for (let i = 0; i <= mainList.length - sl; i++) {
    if (mainList.slice(i, i + sl).every((item, idx) => item === subList[idx]))
      return i;
  }
  return -1;
}

// ============================================================
// Compression (replicated from commonUtils.js)
// ============================================================
magic.bits = 0;
const USX_HCODES_NO_DICT = new Uint8Array([0x00, 0x40, 0x80, 0x00, 0xC0]);
const USX_HCODE_LENS_NO_DICT = new Uint8Array([2, 2, 2, 0, 2]);
const USX_FREQ_SEQ_TXT = ["https://", " the ", " and ", "tion", " with", "ing", "ment", "github.com"];

async function compressDeflate(uint8Array) {
  const buf = await deflateRawP(uint8Array, { level: 6 });
  return new Uint8Array(buf);
}

async function decompressDeflate(uint8Array) {
  const buf = await inflateRawP(uint8Array);
  return new Uint8Array(buf);
}

async function unishoxCompress(str) {
  LOG.step('Compressing message');
  let buf = new Uint8Array(str.length * 4);
  const len = unishox2_compress(str, str.length, buf,
    USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT, USX_TEMPLATES);
  const usxResult = buf.subarray(0, len);
  const deflateResult = await compressDeflate(new TextEncoder().encode(str));
  const useUnishox = usxResult.length < deflateResult.length ? 1 : 0;
  const chosen = useUnishox ? usxResult : deflateResult;
  LOG.val('Original str', str);
  LOG.val('Size (bytes)', str.length);
  LOG.val('Unishox2 size', usxResult.length);
  LOG.val('Deflate size', deflateResult.length);
  LOG.val('Chosen method', useUnishox ? 'unishox2' : 'deflate');
  // LOG.val('Chosen data bytes', _fmt(chosen));
  return [chosen, useUnishox];
}

async function unishoxDecompress(data) {
  // data can be array of bits or Uint8Array
  let secret;
  try {
    const arr = Array.isArray(data)
      ? toBytes([...data, ...Array((8 - data.length % 8) % 8).fill(0)])
      : data;
    secret = new TextDecoder().decode(await decompressDeflate(arr));
  } catch {
    if (Array.isArray(data)) {
      data = toBytes([...data, ...Array((8 - data.length % 8) % 8).fill(1)]);
    }
    secret = unishox2_decompress(data, data.length, null,
      USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT, USX_TEMPLATES);
  }
  return secret;
}

// ============================================================
// ECC Encryption (replicated from commonUtils.js)
// ============================================================
const p = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const sqrtExp = (p + 1n) >> 2n;
const mod = n => ((n %= p) < 0n ? n + p : n);
const pow = (a, e) => { a = mod(a); let r = 1n; for (; e > 0n; e >>= 1n) { if (e & 1n) r = r * a % p; a = a * a % p; } return r; };
const bytesToBigInt = (u8) => { let n = 0n; for (let i = 0; i < u8.length; i++) n = (n << 8n) | BigInt(u8[i]); return n; };
const toBytes32 = (n) => { const u8 = new Uint8Array(32); for (let i = 31; i >= 0; i--) { u8[i] = Number(n & 0xffn); n >>= 8n; } return u8; };
function p256Compress(raw65) {
  const out = new Uint8Array(33);
  out[0] = (raw65[64] & 1) ? 0x03 : 0x02;
  out.set(raw65.subarray(1, 33), 1);
  return out;
}
function p256Decompress(comp33) {
  const xBytes = comp33.subarray(1, 33);
  const x = bytesToBigInt(xBytes);
  let y = pow(x*x % p * x - 3n * x + b, sqrtExp);
  if ((y & 1n) !== BigInt(comp33[0] & 1)) y = p - y;
  const out = new Uint8Array(65);
  out[0] = 0x04;
  out.set(xBytes, 1);
  out.set(toBytes32(y), 33);
  return out;
}
async function eccEncrypt(messageUint8Array, pubJwk) {
  const pubKey = await crypto.subtle.importKey("jwk", pubJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ephemeralKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const sharedSecretKey = await crypto.subtle.deriveKey({ name: "ECDH", public: pubKey }, ephemeralKeyPair.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedSecretKey, messageUint8Array));
  const ephemeralPublicKey = p256Compress(new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)));
  return new Uint8Array([...ephemeralPublicKey, ...iv, ...ciphertext]);
}
async function eccDecrypt(encryptedData, privJwk) {
  const privKey = await crypto.subtle.importKey("jwk", privJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
  const ephemeralPublicKey = await crypto.subtle.importKey("raw", p256Decompress(encryptedData.slice(0, 33)), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecretKey = await crypto.subtle.deriveKey({ name: "ECDH", public: ephemeralPublicKey }, privKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: encryptedData.slice(33, 33 + 12) }, sharedSecretKey, encryptedData.slice(33 + 12)));
}

// ============================================================
// Steganography: Embed (dfs)
// ============================================================
let currentPrompt = [];
let targetBits = [];
let done = false;
let allowInsertion = true;
let eosToken = null;
let logitBias = [];

let coverText = ''; // simulated textarea
let progressLog = [];

async function queryCompletion(promptTokens, tailCompletion) {
  const body = {
    prompt: promptTokens,
    response_fields: tailCompletion
      ? ['content', 'stopping_word', 'stop_type']
      : ['completion_probabilities', 'tokens'],
    logit_bias: logitBias,
  };
  if (tailCompletion) {
    body.stop = punctuations;
    body.n_predict = 32;
  } else {
    body.n_predict = 1;
    body.top_k = 120;
    body.n_probs = 120;
    body.post_sampling_probs = true;
    body.return_tokens = true;
  }
  return apiPost('/completion', body);
}

// --- Llama.cpp token-byte quirk ------------------------------------------
//
// Some model tokens have raw bytes that form INCOMPLETE UTF-8 sequences.
// For example, in Qwen3-0.6B:
//   token 70467  bytes=[0xE2,0x85]                 → 2 bytes of a 3-byte seq
//   token 26525  bytes=[0x20,0xF0,0x9F,0x98]       → space + 3 bytes of a 4-byte seq
//   token 11162  bytes=[0x20,0xF0,0x9F,0x99,0x82]  → space + an incomplete emoji
//
// When the llama.cpp server receives a /completion prompt containing such
// a token ID, it internally attempts to decode the token bytes as UTF-8
// and fails with HTTP 500: "Failed to parse input at pos 0: �".
//
// Compounding this, the /completion JSON response's "token" field is
// unreliable for these tokens:
//   token 26525 → "token":" "   (the leading space)  but bytes include 0xF0,0x9F,0x98
//   token 11162 → "token":""   (empty)               detokenize gives " �" (space+U+FFFD)
//
// Therefore the code MUST NOT rely on cand.token alone to detect
// problematic tokens.  We use two complementary checks:
//   1. cand.bytes → decode as UTF-8 → reject if result contains U+FFFD
//      (catches tokens from the completion_probabilities path)
//   2. detokenize([cand.id]) → reject if result contains U+FFFD
//      (catches tokens from the tokens-only fallback path, where cand.bytes
//       is unavailable)
//
// Additionally, the model may have MULTIPLE token IDs that decode to
// U+FFFD.  init() only biases against the one discovered by calling
// tokenize("\uFFFD").  Other U+FFFD tokens (e.g. 70467) remain unbias'd,
// so the DFS will encounter them naturally — these two checks must
// intercept them.
// --------------------------------------------------------------------------

function hasFFFD(s) {
  return s.includes('\uFFFD');
}

async function dfs(bitPos, accChars, accScore, pending, depth = 0) {
  // LOG.raw(`[dfs depth=${depth}] bitPos=${bitPos}/${targetBits.length} accChars="${accChars}" accScore=${accScore} pending=${pending}`);

  const json = await queryCompletion(currentPrompt, false);
  const probs = json.completion_probabilities;

  // llama.cpp /completion returns two different shapes:
  //   Format A (normal):  {"completion_probabilities":[{top_probs:[{id,token,bytes,prob},...]}], "tokens":[...]}
  //   Format B (forced):  {"tokens":[id]}   — no completion_probabilities, no bytes
  //
  // Format B occurs when the model has essentially no choice, e.g. a
  // continuation byte that must follow a partial UTF-8 prefix.  In that
  // case we synthesise a single candidate with token="" and WITHOUT a
  // "bytes" field.  The byte-level U+FFFD check in the DFS loop is
  // skipped for these candidates, so the detokenize-level check inside
  // the needsDeeperDecode branch serves as the safety net.
  let candidates;
  if (!probs) {
    candidates = [{id: json.tokens[0], token: ""}];
  } else {
    candidates = probs[0].top_probs;
  }
  // LOG.val(`candidates count`, candidates.length);

  for (let j = 0; j < candidates.length; j++) {
    if (done) { /* LOG.raw(`  ◊ done, returning`); */ return; }

    const cand = candidates[j];

    // Defence layer #1: validate token bytes (Format A candidates only).
    // If the raw bytes decode to text containing U+FFFD the token
    // carries an incomplete UTF-8 sequence; pushing it into currentPrompt
    // and sending the next /completion will crash the llama.cpp server.
    if (cand.bytes && cand.bytes.length > 0) {
      const byteDecoded = new TextDecoder().decode(new Uint8Array(cand.bytes));
      if (byteDecoded.includes('\uFFFD')) {
        // LOG.raw(`  [${j}] ⛔ skipping token ${cand.id} (invalid UTF-8 bytes)`);
        continue;
      }
    }
    let tokenText, needsDeeperDecode;

    if (pending > 0) {
      const combined = [...currentPrompt.slice(-pending), cand.id];
      tokenText = await detokenize(combined);
      if (hasFFFD(tokenText)) {
        // LOG.raw(`  [${j}] ⛔ skipping (\uFFFD in combined result)`);
        continue;
      }
      needsDeeperDecode = hasFFFD(tokenText);
    } else {
      tokenText = cand.token;
      needsDeeperDecode = tokenText === '' || (hasFFFD(tokenText) && tokenText[0] !== '\uFFFD');
    }

    const prob = cand.probability !== undefined
      ? (typeof cand.probability === 'number' ? cand.probability.toFixed(6) : cand.probability)
      : (cand.logprob !== undefined ? `logprob=${cand.logprob.toFixed(4)}` : '?');

    // LOG.raw(`  [${j}] token_id=${cand.id} prob=${prob} token="${_fmt(tokenText)}" pending=${pending} needsDeeper=${needsDeeperDecode}`);

    if (needsDeeperDecode) {
      if (pending === 0) {
        const extra = await detokenize([cand.id]);
        if (extra.includes(eosToken) || extra.includes('<|endoftext|>')) {
          // LOG.raw(`    ⛔ skipping (EOS token)`);
          continue;
        }
        // Defence layer #2: detokenize a single token and reject it
        // if the result contains U+FFFD anywhere.  A pure-U+FFFD regex
        // (e.g. /^\uFFFD+$/) is NOT sufficient — some tokens decode to
        // hybrids like " �" (space + U+FFFD) where the stray byte
        // after the printable prefix still crashes the server.
        if (hasFFFD(extra)) {
          // LOG.raw(`    ⛔ skipping (\uFFFD token)`);
          continue;
        }
      }
      currentPrompt.push(cand.id);
      await dfs(bitPos, accChars, accScore, pending + 1, depth + 1);
      currentPrompt.pop();
      continue;
    }

    // Token is decodable — try to embed bits in its characters
    let gChars = accChars;
    let gScore = accScore;
    let bitsMatched = 0;
    const codePoints = [...tokenText];
    // LOG.raw(`    codePoints=[${codePoints.map(c=>'U+' + c.codePointAt(0).toString(16)).join(', ')}]`);

    for (let k = 0; ; k++) {
      if (k >= codePoints.length) {
        // Token fully consumed without matching all bits; accumulate and continue DFS
        currentPrompt.push(cand.id);
        coverText += tokenText;
        // LOG.raw(`    → token consumed, push+recurse (bitsMatched=${bitsMatched})`);
        await dfs(bitPos + bitsMatched, gChars, gScore, 0, depth + 1);
        if (done) return;
        currentPrompt.pop();
        coverText = coverText.slice(0, -tokenText.length);
        break;
      }

      gChars += codePoints[k];
      const cp = codePoints[k].codePointAt(0);
      const w = getWeight(cp);
      gScore += w;
      // LOG.raw(`      char[${k}]="${codePoints[k]}" U+${cp.toString(16)} weight=${w} gChars="${gChars}" gScore=${gScore}`);

      if (gScore >= 3) {
        const parity = getParity(gChars);
        const targetBit = targetBits[bitPos + bitsMatched];
        // LOG.raw(`        gScore>=3 → parity=${parity} targetBit=${targetBit} match=${parity === targetBit}`);

        if (parity !== targetBit) {
          // LOG.raw(`        ✗ mismatch, break`);
          break;
        }

        bitsMatched++;
        gChars = '';
        gScore = 0;

        if (bitPos + bitsMatched === targetBits.length) {
          done = true;
          const usedChars = codePoints.slice(0, k + 1).join('');
          if (allowInsertion) {
            currentPrompt.push(cand.id);
            coverText += tokenText;
            LOG.raw(`✓ ALL BITS EMBEDDED (insertion mode)`);
            const coreLen = coverText.length;
            if (!punctuations.includes(coverText[coverText.length - 1])) {
              coverText += await tailComplete(currentPrompt);
            }
            LOG.raw(`Core coverText length = ${coreLen}`);
            LOG.raw(`Full coverText length = ${coverText.length}`);
          } else {
            coverText += usedChars;
            LOG.raw(`✓ ALL BITS EMBEDDED (extraction mode), used chars: "${_fmt(usedChars)}"`);
            LOG.raw(`Core coverText length = ${coverText.length}`);
            LOG.raw(`Full coverText length = ${coverText.length}`);
          }
          LOG.raw(`Full coverText = ${JSON.stringify(coverText)}`);
          return;
        }
      }
    }
  }
}

async function tailComplete(promptTokens) {
  LOG.step('Tail completion');
  const json = await queryCompletion(promptTokens, true);
  if (json.stopping_word) return json.content + json.stopping_word;
  if (json.stop_type && json.stop_type !== 'none') return json.content;
  return await tailComplete(promptTokens);
}

// ============================================================
// Steganography: Encrypt entry point
// ============================================================
async function encrypt(prompt, plainText, pubKey = null, systemPrompt = null) {

  // 1. Compress
  let [data, useUnishox] = await unishoxCompress(plainText);

  // 2. Optional ECC encryption
  if (pubKey) data = await eccEncrypt(data, pubKey);

  // 3. Convert to binary
  let bits = toBinary(data);
  const trimBit = (useUnishox || pubKey) ? 0 : 1;
  const trimIdx = bits.lastIndexOf(trimBit) + 1;
  bits = bits.slice(0, bits.length - trimIdx <= 7 ? trimIdx : bits.length - 7);
  // LOG.val('Binary bits before magic', _fmt(bits));
  LOG.val('Bit length before magic', bits.length);

  // 4. Wrap with magic markers (insertion mode)
  if (allowInsertion) bits = [...magicNum1, ...bits, ...magicNum2];
  targetBits = bits;
  LOG.val('Total target bits', targetBits.length);
  // LOG.val('Full target bits', _fmt(targetBits));

  // 5. Apply chat template (or fall back to raw prompt)
  let finalPrompt;
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  finalPrompt = await applyTemplate(messages);
  LOG.val('Template-formatted prompt', finalPrompt);

  // 6. Tokenize prompt
  currentPrompt = await tokenize(finalPrompt);
  // LOG.val('Prompt tokens', currentPrompt);

  // 7. Run DFS
  coverText = '';
  done = false;
  await dfs(0, '', 0, 0);
  return coverText;
}

// ============================================================
// Steganography: Extract
// ============================================================
async function extract(coverText, privKey = null) {

  let exBits = [], gChars = '', gScore = 0;
  for (const ch of coverText) {
    gChars += ch;
    gScore += getWeight(ch.codePointAt(0));
    if (gScore >= 3) {
      exBits.push(getParity(gChars));
      gChars = '';
      gScore = 0;
    }
  }
  // LOG.val('Extracted raw bits', _fmt(exBits));
  LOG.val('Raw bit length', exBits.length);

  // Find magic markers
  let i1 = findSublist(exBits, magicNum1);
  let i2 = findSublist(exBits, magicNum2);
  LOG.val('MagicNum1 index', i1);
  LOG.val('MagicNum2 index', i2);

  if (i1 !== -1 && i2 !== -1 && i2 > i1 + magicNum1.length)
    exBits = exBits.slice(i1 + magicNum1.length, i2);

  // Optional ECC decryption
  if (privKey) {
    const padded = toBytes([...exBits, ...Array((8 - exBits.length % 8) % 8).fill(1)]);
    exBits = await eccDecrypt(padded, privKey);
  }

  const result = await unishoxDecompress(exBits);
  LOG.val('Decompressed secret', result);
  return result;
}

// ============================================================
// Init
// ============================================================
async function init() {
  const props = await apiGet('/props');
  // LOG.val('chat_template', props.chat_template);
  eosToken = props.eos_token;
  LOG.val('eos_token', eosToken);

  // logitBias: forbid the primary U+FFFD replacement-character token.
  //
  // NOTE: the model may have SEVERAL token IDs that all decode to
  // U+FFFD (e.g. Qwen3-0.6B has at least 5691 and 70467).  tokenize()
  // only discovers one of them.  The other U+FFFD-tokens are NOT
  // added to the bias and will appear among candidates during DFS.
  // The two defence layers inside dfs() (byte-level check and
  // detokenize-level check) are responsible for intercepting them.
  const ffId = (await tokenize('\uFFFD'))[0];
  logitBias.push([ffId, false]);
  LOG.val('FFFD token id', ffId);
}

// ============================================================
// Main
// ============================================================
async function main() {
  try {
    // Parse CLI args
    const args = process.argv.slice(2);
    let pubKeyPath, privKeyPath;
    let secret = SECRET;
    let prompt = PROMPT;
    let systemPrompt = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--pubkey' && args[i+1]) pubKeyPath = args[++i];
      else if (args[i] === '--privkey' && args[i+1]) privKeyPath = args[++i];
      else if (args[i] === '--no-insertion') allowInsertion = false;
      else if (args[i] === '--secret' && args[i+1]) secret = args[++i];
      else if (args[i] === '--prompt' && args[i+1]) prompt = args[++i];
      else if (args[i] === '--system' && args[i+1]) systemPrompt = args[++i];
    }

    let pubKey = null, privKey = null;
    if (pubKeyPath) pubKey = JSON.parse(readFileSync(pubKeyPath, 'utf-8'));
    if (privKeyPath) privKey = JSON.parse(readFileSync(privKeyPath, 'utf-8'));

    await init();

    // Encode
    const ct = await encrypt(prompt, secret, pubKey, systemPrompt);
    if (!done) {
      LOG.raw('\nCover text generation FAILED — cannot test extraction');
      process.exit(1);
    }

    // Decode
    const extracted = await extract(ct, privKey);

    LOG.title('ROUNDTRIP RESULT');
    LOG.val('Original secret', secret);
    LOG.val('Extracted secret', extracted);
    LOG.val('Roundtrip success', extracted === secret ? 'YES' : 'NO');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
