import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
const directory = 'docs/qa/competition-v3';
const targets = ['src', 'app', 'tests', 'e2e', 'e2e-production', 'scripts'];
function hashes(path) {
  return fs.readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? hashes(`${path}/${entry.name}`)
      : /\.(tsx?|css|mjs|cjs)$/.test(entry.name)
        ? [
            [
              `${path}/${entry.name}`,
              crypto
                .createHash('sha256')
                .update(fs.readFileSync(`${path}/${entry.name}`))
                .digest('hex'),
            ],
          ]
        : [],
  );
}
const report = {
  recordedAt: new Date().toISOString(),
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  sourceDirty: true,
  node: process.version,
  platform: process.platform,
  sourceHashes: Object.fromEntries([
    ...targets.flatMap(hashes),
    ...[
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'tsconfig.json',
      'playwright.config.ts',
      'playwright.production.config.ts',
      '.openai/hosting.json',
    ].map((path) => [
      path,
      crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),
    ]),
  ]),
  checks: [],
};
fs.mkdirSync(directory, { recursive: true });
const commands = [
  ['typecheck', 'npm run typecheck'],
  ['lint', 'npm run lint'],
  ['unit', `npm test -- --reporter=json --outputFile=${directory}/unit.json`],
  ['browser', 'npx playwright test --reporter=line,json'],
  [
    'production',
    'npx playwright test --config=playwright.production.config.ts --reporter=line,json',
  ],
];
for (const [name, command] of commands) {
  const start = Date.now();
  const log = fs.createWriteStream(`${directory}/${name}.log`);
  const child = spawn(command, {
    shell: true,
    env: {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_FILE: `${directory}/${name === 'production' ? 'production' : 'browser-full'}.json`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => {
    log.write(data);
    if (name !== 'unit') process.stdout.write(data);
  });
  child.stderr.on('data', (data) => {
    log.write(data);
    process.stderr.write(data);
  });
  const code = await new Promise((resolve) => child.once('exit', resolve));
  log.end();
  report.checks.push({
    name,
    command,
    exitCode: code,
    elapsedMs: Date.now() - start,
  });
  fs.writeFileSync(`${directory}/checks.json`, JSON.stringify(report, null, 2));
  console.log(`CHECK ${name}: ${code}`);
  if (code !== 0) {
    process.exitCode = 1;
    break;
  }
}
