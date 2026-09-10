import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    return e.isDirectory() ? walk(file) : [file];
  });
}
const files = walk('dist').map(file => {
  const bytes = fs.readFileSync(file);
  return { path: file.replaceAll('\\', '/'), bytes: bytes.length,
    ...(/\.(?:js|css|html|json)$/.test(file) ? { gzipBytes: gzipSync(bytes).length, brotliBytes: brotliCompressSync(bytes).length } : {}) };
});
const js = files.filter(f => f.path.endsWith('.js'));
if (!files.some(f => f.path === 'dist/index.html' && f.bytes > 0) || !js.some(f => f.bytes > 0))
  throw Error('Production build must contain a non-empty HTML entry and JavaScript assets');
const forbidden = ['/dev/debugger', 'Spawn enemy / Boss', 'ReplayViewer', 'Simulation debugger'];
const violations = js.flatMap(f => forbidden.filter(word => fs.readFileSync(f.path, 'utf8').includes(word)).map(word => ({ file: f.path, word })));
const report = { recordedAt: new Date().toISOString(), method: 'All dist files, on-disk bytes; compressed values are local encodings, not observed network transfer sizes. DEV marker scan plus browser acceptance; not a proof against arbitrary dead code.',
  totalBytes: files.reduce((n, f) => n + f.bytes, 0), javascriptBytes: js.reduce((n, f) => n + f.bytes, 0),
  productionDebugMarkers: violations, files };
fs.mkdirSync('docs/qa/engineering', { recursive: true });
fs.writeFileSync('docs/qa/engineering/bundle.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ totalBytes: report.totalBytes, javascriptBytes: report.javascriptBytes, productionDebugMarkers: violations }));
if (violations.length) process.exitCode = 1;
