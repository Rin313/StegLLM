export const $ = id => document.getElementById(id);
function setButtonType() {
    document.querySelectorAll('button').forEach(button => {
        button.setAttribute('type', button.closest('form') ? 'submit' : 'button');//button的tupe包括submit、reset和button
    });
}
function setThemeControllerListener(){
    document.querySelectorAll(`input[name="theme-dropdown"]`).forEach(button=>{
        button.addEventListener('change', function(event) {
            if (event.target.checked) set('theme', event.target.value);
        });
    })
}
export function init(){
    setButtonType();
    setThemeControllerListener();
    initConfig();
}
export function initConfig(f=()=>{}){//当配置修改时需要复用
    const theme = get("theme", "default");
    document.querySelectorAll(`input[name="theme-dropdown"]`).forEach(button=>{
        if (button.value === theme) button.checked = true;
    })
    f();
}
export function get(key, defaultValue) {
    const obj=localStorage.getItem(key);
    return obj?JSON.parse(obj):defaultValue;
}
export function set(key,obj) {
    if (obj===''||Array.isArray(obj)&&obj.length===0)//不会传入空值（假设逻辑正确），仅存在传入空字符串或空数组
        localStorage.removeItem(key);
    else
        localStorage.setItem(key, JSON.stringify(obj));
}
export function add(key,obj,index=-1){
    let list=get(key,[]);
    if(index===-1)
        list.push(obj);
    else {
        if(obj)
            list[index]=obj;
        else if(list.length>0){
            list.splice(index,1);
        }
    }
    set(key,list)
}
function clear(){
    localStorage.clear();
}
export function runIfMatch(key,defaultValue,opts,f=()=>{}){
    const obj=get(key,defaultValue);
    for (const [opt, value] of Object.entries(opts))
        if(obj===opt) return f(value);
    set(key,defaultValue);//如果存在新版本key弃用的值，就重新初始化
}
function createElement(tag,props={},styles={},parent=null){
    const el = Object.assign(document.createElement(tag), props);
    Object.assign(el.style,styles);
    if(parent)parent.appendChild(el);
    return el;
}
function exportFile(content,filename){
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    createElement('a',{
        href: url,
        download: filename
    }).click();
    URL.revokeObjectURL(url);
}
async function exportKeys(keyPair) {//导出为文件而不是字符串，避免剪切板风险//公钥可以从私钥计算得到，没有必要额外存储公钥
    const publickey=await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);// 导出为 JWK 格式。RAW，适用对称密钥和椭圆曲线公钥；PKCS8.适用RSA和椭圆曲线私钥；SPKI，适用于RSA和椭圆曲线公钥；JWK，适用任何类型密钥
    const privateKey=await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const kid=crypto.randomUUID();//标记密钥对便于区分
    exportFile(JSON.stringify(publickey),"public_"+kid)
    exportFile(JSON.stringify(privateKey),"private_"+kid)
}
export async function generateKeyPair() {// 生成 ECC 密钥对
    const keyPair=await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: 'P-256'//P-256/P-384/P-521，P256的共享密钥最短，即密文最短
        },
        true,// 密钥是否可导出
        ["deriveKey"]
    );
    await exportKeys(keyPair);
}
export function exportLocalStorage() {
    const obj = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        obj[key] = JSON.parse(value);
    }
    exportFile(JSON.stringify(obj),"config.json");
}
function importTextFile() {
    return new Promise((resolve) => {
        const input = createElement('input',{type:'file'});
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsText(file);
        };
        input.click();
    });
}
export function readTextFile(fileInput) {
    return new Promise((resolve) => {
        const files = fileInput.files;
        if (files&&files.length>0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.readAsText(file);
        }
        else resolve(null);
    });
}
export async function importLocalStorage() {
    const obj=JSON.parse(await importTextFile());//如果未提交则后面不会执行
    clear();
    for (const [key, value] of Object.entries(obj))
        set(key,value);
}
export function shuffle(array, start = 0, end = array.length) {
    for (let i = end - 1; i > start; i--) {
        const j = Math.floor(Math.random() * (i - start + 1)) + start;
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function uint8ArrayToReadableStream(uint8Array) {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(uint8Array);
            controller.close();
        }
    });
}
async function readStream(stream) {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const compressedData = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));//拼接chunk的低内存占用方式
    let offset = 0;
    for (const chunk of chunks) {
        compressedData.set(chunk, offset);
        offset += chunk.length;
    }
    return compressedData;
}
async function compress(uint8Array,format='deflate-raw') {//format:`gzip`,`deflate`,`deflate-raw`
    return await readStream(uint8ArrayToReadableStream(uint8Array).pipeThrough(new CompressionStream(format)));
}
async function decompress(uint8Array,format='deflate-raw') {
    return await readStream(uint8ArrayToReadableStream(uint8Array).pipeThrough(new DecompressionStream(format)));
}
import {unishox2_compress,unishox2_decompress,magic} from 'unishox2.siara.cc';
magic.bits=0;
const utf8Encoder= new TextEncoder();
const utf8Decoder=new TextDecoder();
const USX_HCODES_NO_DICT = new Uint8Array([0x00,0x40,0x80,0x00,0xC0]);//偏爱无重复内容
const USX_HCODE_LENS_NO_DICT = new Uint8Array([2,2,2,0,2]);
const USX_FREQ_SEQ_TXT= ["https://"," the "," and ","tion"," with","ing","ment","github.com"];//中文很难找规律，待定:"我们","一个"
const USX_TEMPLATES = ["tfff-of-tfTtf:rf:rf.fffZ", "tfff-of-tf", "(fff) fff-ffff", "tf:rf:rf", 0];
export async function unishoxCompress(str){
    let t = new Uint8Array(str.length*4);
    const len =unishox2_compress(str,str.length, t,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    const result1=t.subarray(0,len);
    const result2=await compress(utf8Encoder.encode(str));
    return result1.length<result2.length?[result1,1]:[result2,0];//unishox2末尾补齐1，deflate按规范则应该是补齐0，但做截断处理平均减少3.5bit，但长度单位由字节变为bit，可表示量变为8192字节。而且这种方式也不适用加密。
}
export async function unishoxDecompress(base){
    //return useUnishox?unishox2_decompress(uint8Array,uint8Array.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES):utf8Decoder.decode(await decompress(uint8Array));
    let secret;
    try{
        secret=utf8Decoder.decode(await decompress(Array.isArray(base)?toBytes([...base, ...Array((8 - base.length % 8) % 8).fill(0)]):base));
    }
    catch{
        if(Array.isArray(base)){
            base=toBytes([...base, ...Array((8 - base.length % 8) % 8).fill(1)]);
        }
        secret=unishox2_decompress(base,base.length,null,USX_HCODES_NO_DICT, USX_HCODE_LENS_NO_DICT, USX_FREQ_SEQ_TXT,USX_TEMPLATES);
    }
    return secret;
}
/**
 * Compresses a P-256 uncompressed public key using native JavaScript.
 * Assumes the input uncompressedKey is a valid 65-byte Uint8Array
 * starting with 0x04, followed by 32-byte X and 32-byte Y coordinates.
 *
 * @param {Uint8Array} uncompressedKey - The uncompressed public key (65 bytes).
 * @returns {Uint8Array} The compressed public key (33 bytes).
 */
function compressPublicKey(uncompressedKey) {
    // Assuming uncompressedKey is valid as per the problem statement:
    // - Length is 65 bytes.
    // - uncompressedKey[0] is 0x04.

    // Extract X coordinate (bytes 1-32, 0-indexed)
    const x = uncompressedKey.slice(1, 33); // 32 bytes

    // Extract Y coordinate (bytes 33-64, 0-indexed)
    const y = uncompressedKey.slice(33, 65); // 32 bytes

    // Determine the parity of Y.
    // The Y coordinate is a 32-byte big-endian integer.
    // Its parity is determined by the least significant bit of its last byte.
    // y[31] is the last byte of the Y coordinate.
    const yIsEven = (y[31] & 0x01) === 0;

    // Set the prefix byte for the compressed key
    const prefix = yIsEven ? 0x02 : 0x03;

    // Create the compressed key (1 byte prefix + 32 bytes X)
    const compressedKey = new Uint8Array(33);
    compressedKey[0] = prefix;
    compressedKey.set(x, 1); // Copy X coordinate starting at index 1 of compressedKey

    return compressedKey;
}
// P-256 curve parameters
const p = BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
const a = BigInt(-3);
const b = BigInt('0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B');

/**
 * Modular exponentiation: (base^exp) % mod
 */
function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        base = (base * base) % mod;
        exp = exp / 2n;
    }
    return result;
}

/**
 * Modular inverse using Fermat's Little Theorem
 */
function modInv(a, mod) {
    return modPow(a, mod - 2n, mod);
}

/**
 * Modular square root for p ≡ 3 mod 4
 */
function modSqrt(a, p) {
    return modPow(a, (p + 1n) / 4n, p);
}

/**
 * Convert Uint8Array to BigInt (big-endian)
 */
function bytesToBigInt(bytes) {
    let hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return BigInt('0x' + hex);
}

/**
 * Convert BigInt to 32-byte Uint8Array (big-endian)
 */
function bigIntToBytes(bn) {
    const hex = bn.toString(16).padStart(64, '0');
    const bytes = [];
    for (let i = 0; i < 64; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return new Uint8Array(bytes);
}

/**
 * Decompress a P-256 compressed public key.
 * @param {Uint8Array} compressedKey - A 33-byte compressed EC public key.
 * @returns {Uint8Array} - The 65-byte uncompressed EC public key.
 */
function decompressPublicKey(compressedKey) {
    if (!(compressedKey instanceof Uint8Array) || compressedKey.length !== 33) {
        throw new Error("Invalid compressed public key format.");
    }

    const prefix = compressedKey[0];
    if (prefix !== 0x02 && prefix !== 0x03) {
        throw new Error("Invalid compressed key prefix. Expected 0x02 or 0x03.");
    }

    const x = bytesToBigInt(compressedKey.slice(1)); // 32 bytes

    // y^2 = x^3 + ax + b mod p
    const y2 = (x ** 3n + a * x + b) % p;

    // Compute sqrt(y2) mod p
    let y = modSqrt(y2, p);

    // Choose the root matching prefix parity
    const isEven = y % 2n === 0n;
    const shouldBeEven = prefix === 0x02;
    if (isEven !== shouldBeEven) {
        y = p - y;
    }

    const xBytes = bigIntToBytes(x);
    const yBytes = bigIntToBytes(y);

    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(xBytes, 1);
    uncompressed.set(yBytes, 33);

    return uncompressed;
}
export async function eccEncryptToUint8Array(messageUint8Array, recipientPublicJwk) {//ECC（如 ECDH）用来安全地派生一个共享对称密钥，AES-GCM 用这个密钥来高效、安全地加密数据。这是现代加密通信的标准做法，称为「混合加密（Hybrid Encryption）」。
    //导入接收方公钥
    const recipientPublicKey = await crypto.subtle.importKey(
        "jwk",
        recipientPublicJwk,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        false,
        []
    );
    //生成发送方临时密钥对
    const ephemeralKeyPair = await crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        ["deriveKey"]
    );
    //导出临时公钥
    let ephemeralPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)
    );
    //压缩临时公钥
    ephemeralPublicKeyRaw=compressPublicKey(ephemeralPublicKeyRaw);
    //派生共享密钥
    const sharedSecretKey = await crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: recipientPublicKey,
        },
        ephemeralKeyPair.privateKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt"]
    );

    //生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    //加密数据（使用 AES-GCM）
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        sharedSecretKey,
        messageUint8Array
    );
    const ciphertext = new Uint8Array(encryptedBuffer);
    // 格式: [ephemeralPublicKey| iv| ciphertext]
    const totalLength = ephemeralPublicKeyRaw.length + iv.length + ciphertext.length;
    const result = new Uint8Array(totalLength);
    result.set(ephemeralPublicKeyRaw, 0);
    result.set(iv, ephemeralPublicKeyRaw.length);
    result.set(ciphertext, ephemeralPublicKeyRaw.length + iv.length);
    return result;
}
export async function eccDecryptToUint8Array(encryptedData, recipientPrivateJwk) {
    try {
        // 1. 导入接收方私钥
        const recipientPrivateKey = await crypto.subtle.importKey(
            "jwk",
            recipientPrivateJwk,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            ["deriveKey"]
        );
        // 压缩的公钥长度为33字节（P-256压缩格式）
        const ephemeralPublicKeyLength = 33;
        // IV 长度为12字节（AES-GCM标准）
        const ivLength = 12;

        // 提取临时公钥（压缩格式）
        const ephemeralPublicKeyCompressed = encryptedData.slice(0, ephemeralPublicKeyLength);
        // 提取 IV
        const iv = encryptedData.slice(ephemeralPublicKeyLength, ephemeralPublicKeyLength + ivLength);
        // 提取密文
        const ciphertext = encryptedData.slice(ephemeralPublicKeyLength + ivLength);

        // 3. 解压临时公钥并导入
        const ephemeralPublicKeyRaw = decompressPublicKey(ephemeralPublicKeyCompressed);
        const ephemeralPublicKey = await crypto.subtle.importKey(
            "raw",
            ephemeralPublicKeyRaw,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            []
        );

        // 4. 派生共享密钥
        const sharedSecretKey = await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: ephemeralPublicKey,
            },
            recipientPrivateKey,
            {
                name: "AES-GCM",
                length: 256,
                tagLength:128 //AES-GCM 规范建议它应该是 96、104、112、120 或 128，默认值128。似乎对输出长度没有影响？
            },
            false,
            ["decrypt"]
        );

        // 5. 解密数据
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedSecretKey,
            ciphertext
        );

        // 6. 返回解密后的明文
        return new Uint8Array(decryptedBuffer);
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}
export async function tokenize(str) {
    const response = await fetch('http://127.0.0.1:8090/tokenize', {
        method: 'POST',
        body: JSON.stringify({content: str}),
    });
    return (await response.json()).tokens;
}
export async function detokenize(tokens) {
    const response = await fetch('http://127.0.0.1:8090/detokenize', {
        method: 'POST',
        body: JSON.stringify({tokens: tokens}),
    });
    return (await response.json()).content;
}
export function toBinary(bytes){
    let base2=[];
    for (let b of bytes) {
        for(let i=7;i>=0;i--){
            base2.push(b>>i & 0x01);
        }
    }
    return base2;
}
export function toBytes(base){
    let bytes = new Uint8Array(base.length/8);let k=0;
    for(let i=0;i<base.length;i+=8){
        bytes[k++]=base[i]*128+base[i+1]*64+base[i+2]*32+base[i+3]*16+base[i+4]*8+base[i+5]*4+base[i+6]*2+base[i+7];
    }
    return bytes;
}
const invisibleChars = new Set([
    0x200B, 0x200C, 0x200D, 0xFEFF, 0x200E, 0x200F, 0x061C, 0x180E,
    0x00AD, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x0600, 0x0601,
    0x0602, 0x0603, 0x0604, 0x06DD, 0x070F, 0x08E2, 0x110BD, 0x110CD,
]);

const invisibleRanges = [
    [0x202A, 0x202E], [0x2066, 0x206F], [0xFFF9, 0xFFFB], [0x1BCA0, 0x1BCA3],
    [0x1D165, 0x1D169], [0x1D173, 0x1D17A], [0xE0000, 0xE007F],
];

function isInvisibleChar(codePoint) {
    // 控制字符不应该被认为是不可见符号，实测很多符号在不同平台都有特定的显示。
    if (invisibleChars.has(codePoint)) {
        return true;
    }

    for (const [start, end] of invisibleRanges) {
        if (codePoint >= start && codePoint <= end) {
            return true;
        }
    }
    return false;
}
function containsInvisibleChar(str) {
    for (const codePoint of str) {
        if (isInvisibleChar(codePoint.codePointAt(0))) {
            return true;
        }
    }
    return false;
}
export function findSublistIndex(mainList, subList) {
    const subListLength = subList.length;
    for (let i = 0; i <= mainList.length - subListLength; i++) {
        const slice = mainList.slice(i, i + subListLength);
        if (slice.every((item, index) => item === subList[index])) {
            return i; // 返回子列表的起始索引
        }
    }
    return -1; // 如果没有找到，返回 -1
}
export function stringToUnicode(str) {
    return Array.from(str)
        .map(char => {
            const codePoint = char.codePointAt(0);
            const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
            return '\\u' + hex;
        })
        .join('');
}
const defaultOptions = {
    // 需要检测的特定字符数组
    includeChars: [
        ' ',//不间断空格是用于精确排版的符号，通常在复制带格式的文本时出现，几乎不可能手动使用
        '　',//全角空格，一般只用于段首排版，非常傻逼
    ],
    // 需要检测的字符区间数组，格式为 [[startChar, endChar], ...]
    charRanges: [],
    // 需要检测的子串数组
    includeSubstrings: [
        "\r\n",//windows系统的换行，但现代的编程中应该不用手动处理
        " \n"//实在不明白空格后再换行有什么意义
    ]
};
export function check(str, options = {}) {
    const config = { ...defaultOptions, ...options };
    if(!str)return false;//不知道为什么会存在空字符串的token
    if(containsInvisibleChar(str)) return false;
    // 检测是否包含特定字符
    const charsValid = config.includeChars.some(char => str.includes(char));
    if (charsValid) return false;
    // 检测是否包含字符区间的字符
    const rangesValid = config.charRanges.some(([start, end]) => {
        const rangeRegex = new RegExp(`[${start}-${end}]`);
        return rangeRegex.test(str);
    });
    if (rangesValid) return false;
    // 检测是否包含子串
    const substringsValid = config.includeSubstrings.some(substring => str.includes(substring));
    return !substringsValid;
}