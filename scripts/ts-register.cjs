const fs = require('node:fs');
const ts = require('typescript');
// Isolated tooling process only; never installed into the browser application.
// oxlint-disable-next-line typescript/no-deprecated
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
