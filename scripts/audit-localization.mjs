import ts from 'typescript';
import fs from 'node:fs';
const en = {
  ...JSON.parse(fs.readFileSync('src/ui/locale-shell.json', 'utf8')),
};
for (const file of [
  'locale-content',
  'locale-interface',
  'locale-trial',
  'locale-coach',
]) {
  if (!fs.existsSync(`src/ui/${file}.ts`)) continue;
  const data = fs.readFileSync(`src/ui/${file}.ts`, 'utf8').split('`')[1];
  for (const row of data.trim().split('\n')) {
    const i = row.indexOf('|');
    en[row.slice(0, i)] = row.slice(i + 1);
  }
}
const pattern = new RegExp(
  Object.keys(en)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);
const files = [
  'src/ui/GameApp.tsx',
  'src/ui/SettingsPanel.tsx',
  'src/ui/EconomyPanels.tsx',
  'src/ui/ProtocolPanels.tsx',
  'src/ui/PilgrimagePanels.tsx',
  'src/ui/InputSettings.tsx',
  'src/ui/FieldGuidePanel.tsx',
  'src/ui/CoachPanel.tsx',
  'src/trial/TrialApp.tsx',
  'src/activities/ActivityApp.tsx',
  'src/cards/catalog.ts',
  'src/cards/synergies.ts',
  'src/cards/preview.ts',
  'src/progression/catalog.ts',
  'src/economy/catalog.ts',
  'src/data/enemies.ts',
  'src/game/field-guide.ts',
  'src/coach/knowledge.ts',
  'src/coach/simulation.ts',
  'src/combat/weapon-profile.ts',
  'src/trial/config.ts',
  'src/activities/definition.ts',
  'src/render/telegraphs.ts',
];
const missing = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const rows = [];
  const walk = (n) => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isJsxText(n)
    ) {
      const text = n.text.replace(/\s+/g, ' ').trim();
      if (/[\u3400-\u9fff]/.test(text) && !en[text]) {
        const result = text.replace(pattern, (x) => en[x]);
        if (/[\u3400-\u9fff]/.test(result)) rows.push(text);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  if (rows.length) missing.push({ file, rows: [...new Set(rows)] });
}
fs.writeFileSync(
  'outputs/localization/missing.json',
  JSON.stringify(missing, null, 2),
);
for (const group of missing) console.log(group.file, group.rows.length);
