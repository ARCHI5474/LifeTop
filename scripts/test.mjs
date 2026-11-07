import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'all';
if (!['all', 'unit', 'browser'].includes(mode)) throw Error(`Unknown test group: ${mode}`);
const files = readdirSync(path.join(root, 'tests')).sort();
const results = [];
function run(name, args) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', timeout: 120_000,
    env: process.env, maxBuffer: 8 * 1024 * 1024,
  });
  const passed = result.status === 0 && !result.error;
  const output = (result.stdout || '') + (result.stderr || '') + (result.error?.message || '');
  results.push({ name, passed, durationMs: Date.now() - start, output });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} (${Date.now() - start}ms)`);
  if (!passed) console.error(output);
}
mkdirSync(path.join(root, 'test-artifacts'), { recursive: true });
if (mode !== 'browser') run('unit', ['--test', ...files.filter(f => f.endsWith('.test.mjs')).map(f => `tests/${f}`)]);
if (mode !== 'unit') for (const file of files.filter(f => f.endsWith('.cjs'))) run(file, [`tests/${file}`]);
writeFileSync(path.join(root, `test-artifacts/results-${mode}.json`), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.passed);
console.log(`${results.length - failed.length}/${results.length} test suites passed`);
if (failed.length) process.exitCode = 1;
