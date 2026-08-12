// Runs every suite in one shot. Each child exits non-zero on failure.
const SUITES: [string, string[]][] = [
  ['layout   ', ['test', 'layout.test.ts']],
  ['atlas    ', ['run', 'verify-atlas.ts']],
  ['ink fit  ', ['run', 'verify-ink.ts']],
  ['events   ', ['run', 'verify-events.ts']],
  ['demo     ', ['run', 'demo.ts', '--headless']],
];

let failed = 0;
for (const [name, args] of SUITES) {
  const proc = Bun.spawnSync(['bun', ...args], { cwd: import.meta.dir, stdout: 'pipe', stderr: 'pipe' });
  const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
  const ok = proc.exitCode === 0;
  if (!ok) failed++;

  // Pull the one line worth showing from each suite.
  const summary = out.split('\n').filter(Boolean).reverse().find(l =>
    /pass|passed|fit their measured box|frames=/.test(l)) ?? '(no summary)';
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${summary.trim()}`);
  if (!ok) console.log(out.split('\n').map(l => `       ${l}`).join('\n'));
}

console.log(failed ? `\n${failed} suite(s) failed` : '\nall suites passed');
process.exit(failed ? 1 : 0);
