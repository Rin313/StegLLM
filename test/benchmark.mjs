#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Config - 固定相同的样例
// ============================================================
const TEST_CASES = [
  { name: 'short', secret: 'test', prompt: 'What is the capital of France?' },
  { name: 'medium', secret: 'Hello, this is a medium length secret message for testing.', prompt: 'What is the capital of France?' },
  { name: 'chinese', secret: '这是一个中文测试消息，用于验证隐写术的效果。', prompt: 'What is the capital of France?' },
];

const RUNS_PER_CASE = 3;

const SCRIPTS = [
  { name: 'byte-level', path: join(__dirname, 'stego_debug.mjs') },
  { name: 'char-level', path: join(__dirname, 'stego_debug_legacy.mjs') },
];

// ============================================================
// Helpers
// ============================================================
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const proc = spawn('node', [scriptPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({ code, stdout, stderr, duration });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function parseLogFile(logPath) {
  try {
    const content = readFileSync(logPath, 'utf-8');
    const result = {
      bitLength: null,
      totalTargetBits: null,
      coverText: null,
      coverTextLength: null,
      coreCoverTextLength: null,
      extractedSecret: null,
      roundtripSuccess: null,
    };

    // Parse bit length
    const bitLenMatch = content.match(/Bit length before magic = (\d+)/);
    if (bitLenMatch) result.bitLength = parseInt(bitLenMatch[1]);

    // Parse total target bits
    const totalBitsMatch = content.match(/Total target bits = (\d+)/);
    if (totalBitsMatch) result.totalTargetBits = parseInt(totalBitsMatch[1]);

    // Parse core cover text length (before tail completion)
    const coreLenMatch = content.match(/Core coverText length = (\d+)/);
    if (coreLenMatch) result.coreCoverTextLength = parseInt(coreLenMatch[1]);

    // Parse full cover text length (after tail completion)
    const fullLenMatch = content.match(/Full coverText length = (\d+)/);
    if (fullLenMatch) result.coverTextLength = parseInt(fullLenMatch[1]);

    // Parse full cover text (JSON-quoted, single-line)
    const coverTextMatch = content.match(/Full coverText = "((?:\\.|[^"\\])*)"/);
    if (coverTextMatch) {
      try {
        result.coverText = JSON.parse(`"${coverTextMatch[1]}"`);
      } catch {
        result.coverText = coverTextMatch[1];
      }
    }

    // Parse extracted secret
    const extractedMatch = content.match(/Extracted secret = (.+)/);
    if (extractedMatch) result.extractedSecret = extractedMatch[1];

    // Parse roundtrip success
    const successMatch = content.match(/Roundtrip success = (YES|NO)/);
    if (successMatch) result.roundtripSuccess = successMatch[1] === 'YES';

    return result;
  } catch (err) {
    return { error: err.message };
  }
}

// ============================================================
// Main benchmark
// ============================================================
async function runBenchmark() {
  const results = [];
  const reportFile = join(__dirname, 'benchmark_report.txt');

  writeFileSync(reportFile, `Steganography Benchmark Report
Generated: ${new Date().toISOString()}
Runs per case: ${RUNS_PER_CASE}
${'='.repeat(70)}

TEST CASES:
${TEST_CASES.map(tc => `  ${tc.name}: secret="${tc.secret}" (${tc.secret.length} chars)`).join('\n')}

${'='.repeat(70)}

`, 'utf-8');

  console.log(`Starting benchmark with ${TEST_CASES.length} test cases, ${RUNS_PER_CASE} runs each\n`);

  for (const script of SCRIPTS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${script.name}`);
    console.log(`${'='.repeat(50)}\n`);

    appendFileSync(reportFile, `\n[${script.name.toUpperCase()}]\n${'-'.repeat(40)}\n`, 'utf-8');

    const scriptResults = [];

    for (const testCase of TEST_CASES) {
      console.log(`  Case: ${testCase.name} (secret length: ${testCase.secret.length})`);

      const caseResults = [];

      for (let run = 1; run <= RUNS_PER_CASE; run++) {
        process.stdout.write(`    Run ${run}/${RUNS_PER_CASE}... `);

        const args = ['--secret', testCase.secret, '--prompt', testCase.prompt];
        const result = await runScript(script.path, args);
        const logPath = script.path.replace('.mjs', '_log.txt');
        const logData = parseLogFile(logPath);

        const runResult = {
          run,
          exitCode: result.code,
          duration: result.duration,
          success: logData.roundtripSuccess === true,
          bitLength: logData.bitLength,
          totalTargetBits: logData.totalTargetBits,
          coverText: logData.coverText,
          coverTextLength: logData.coverTextLength,
          coreCoverTextLength: logData.coreCoverTextLength,
          extractedSecret: logData.extractedSecret,
          error: result.code !== 0 ? result.stderr.slice(0, 200) : null,
        };

        caseResults.push(runResult);
        scriptResults.push({ testCase: testCase.name, ...runResult });

        console.log(runResult.success
          ? `OK (${formatDuration(result.duration)}, core: ${logData.coreCoverTextLength || '?'} chars, full: ${logData.coverTextLength || '?'} chars)`
          : `FAIL (${formatDuration(result.duration)})`);

        if (runResult.error) {
          console.log(`      Error: ${runResult.error.slice(0, 100)}...`);
        }
      }

      // Calculate stats for this case
      const successes = caseResults.filter(r => r.success);
      const durations = caseResults.map(r => r.duration);
      const coreCoverLengths = caseResults.filter(r => r.success).map(r => r.coreCoverTextLength).filter(Boolean);
      const coverLengths = caseResults.filter(r => r.success).map(r => r.coverTextLength).filter(Boolean);

      const stats = {
        testCase: testCase.name,
        secret: testCase.secret,
        secretLength: testCase.secret.length,
        successRate: `${successes.length}/${RUNS_PER_CASE}`,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        avgCoreCoverLength: coreCoverLengths.length > 0
          ? coreCoverLengths.reduce((a, b) => a + b, 0) / coreCoverLengths.length
          : null,
        coreExpansionRatio: coreCoverLengths.length > 0 && testCase.secret.length > 0
          ? (coreCoverLengths.reduce((a, b) => a + b, 0) / coreCoverLengths.length) / testCase.secret.length
          : null,
        avgCoverLength: coverLengths.length > 0
          ? coverLengths.reduce((a, b) => a + b, 0) / coverLengths.length
          : null,
        expansionRatio: coverLengths.length > 0 && testCase.secret.length > 0
          ? (coverLengths.reduce((a, b) => a + b, 0) / coverLengths.length) / testCase.secret.length
          : null,
        coverTexts: caseResults.filter(r => r.success).map(r => r.coverText).filter(Boolean),
      };

      results.push({ script: script.name, ...stats });

      appendFileSync(reportFile, `
  Case: ${testCase.name}
    Secret: "${testCase.secret}" (${testCase.secret.length} chars)
    Success rate: ${stats.successRate}
    Duration: avg=${formatDuration(stats.avgDuration)}, min=${formatDuration(stats.minDuration)}, max=${formatDuration(stats.maxDuration)}
    Core cover text length: avg=${stats.avgCoreCoverLength?.toFixed(1) || 'N/A'} chars
    Core expansion ratio: ${stats.coreExpansionRatio?.toFixed(2) || 'N/A'}x
    Full cover text length: avg=${stats.avgCoverLength?.toFixed(1) || 'N/A'} chars
    Full expansion ratio: ${stats.expansionRatio?.toFixed(2) || 'N/A'}x
`, 'utf-8');

      // 写入 cover text 内容（完整）
      if (stats.coverTexts.length > 0) {
        appendFileSync(reportFile, `    Cover texts:\n`, 'utf-8');
        stats.coverTexts.forEach((ct, i) => {
          appendFileSync(reportFile, `      [${i + 1}] ${ct}\n`, 'utf-8');
        });
      }
    }
  }

  // Summary comparison
  appendFileSync(reportFile, `\n\n${'='.repeat(70)}\nSUMMARY COMPARISON\n${'='.repeat(70)}\n`, 'utf-8');

  for (const testCase of TEST_CASES) {
    appendFileSync(reportFile, `\n[${testCase.name}]\n`, 'utf-8');
    appendFileSync(reportFile, `  Secret: "${testCase.secret}"\n`, 'utf-8');

     for (const script of SCRIPTS) {
      const r = results.find(r => r.script === script.name && r.testCase === testCase.name);
      if (r) {
        appendFileSync(reportFile, `\n  ${script.name}:\n`, 'utf-8');
        appendFileSync(reportFile, `    success=${r.successRate}, avg=${formatDuration(r.avgDuration)}, core=${r.avgCoreCoverLength?.toFixed(1) || 'N/A'} chars, core_ratio=${r.coreExpansionRatio?.toFixed(2) || 'N/A'}x, full=${r.avgCoverLength?.toFixed(1) || 'N/A'} chars, full_ratio=${r.expansionRatio?.toFixed(2) || 'N/A'}x\n`, 'utf-8');
        if (r.coverTexts && r.coverTexts.length > 0) {
          appendFileSync(reportFile, `    Cover texts:\n`, 'utf-8');
          r.coverTexts.forEach((ct, i) => {
            appendFileSync(reportFile, `      [${i + 1}] ${ct}\n`, 'utf-8');
          });
        }
      }
    }
  }

  console.log(`\n\n${'='.repeat(50)}`);
  console.log('Benchmark complete!');
  console.log(`Report saved to: ${reportFile}`);
  console.log(`${'='.repeat(50)}\n`);
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
