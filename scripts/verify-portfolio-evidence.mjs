import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const directory = 'public/portfolio/cases';
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, 'real-models.json'), 'utf8'),
);
assert.equal(manifest.rows.length, 3);
const reports = [];
for (const row of manifest.rows) {
  assert.match(row.receipt, /^[a-z-]+\.json$/);
  const bytes = fs.readFileSync(path.join(directory, row.receipt));
  assert.equal(
    crypto.createHash('sha256').update(bytes).digest('hex'),
    row.sha256,
  );
  assert.doesNotMatch(
    bytes.toString(),
    /sk-[A-Za-z0-9]{16,}/,
    'Possible credential in a public receipt',
  );
  const raw = JSON.parse(bytes);
  let attempts, input, output, result;
  if (row.project === 'repopilot') {
    attempts = raw.provider_calls_attempted;
    input = raw.usage.input_tokens;
    output = raw.usage.output_tokens;
    result =
      raw.status === 'passed' && Object.values(raw.checks).every(Boolean)
        ? '1 / 1'
        : '0 / 1';
    assert.equal(raw.is_model_benchmark, false);
    assert.equal(raw.task.evidence_label, 'real-provider-run');
  } else if (row.project === 'opspilot') {
    attempts = raw.http_attempts;
    input = raw.rows.reduce((sum, item) => sum + item.result.tokens.input, 0);
    output = raw.rows.reduce((sum, item) => sum + item.result.tokens.output, 0);
    result = `${raw.rows.filter((item) => item.matched).length} / ${raw.rows.length}`;
    assert.equal(raw.business_effects, 0);
    assert.ok(
      raw.rows.every(
        (item) => item.result.metadata.synthetic_provider === false,
      ),
    );
  } else {
    assert.equal(row.project, 'designlens');
    attempts = raw.attempted_calls;
    input = raw.results.reduce(
      (sum, item) => sum + item.token_usage.prompt_tokens,
      0,
    );
    output = raw.results.reduce(
      (sum, item) => sum + item.token_usage.completion_tokens,
      0,
    );
    result = `${raw.results.filter((item) => item.task_success).length} / ${raw.results.length}`;
    assert.equal(raw.real_participants, 0);
    assert.equal(raw.validated_product_decisions, 0);
  }
  assert.deepEqual(
    [row.attempts, row.inputTokens, row.outputTokens, row.result],
    [attempts, input, output, result],
  );
  reports.push({
    project: row.project,
    attempts,
    input,
    output,
    result,
    receiptSha256: row.sha256,
  });
}
const native = JSON.parse(
  fs.readFileSync(path.join(directory, 'aegis.json'), 'utf8'),
);
const bundled = JSON.parse(
  fs.readFileSync('src/lab/data/aegis-case.json', 'utf8'),
);
assert.deepEqual(
  native,
  bundled,
  'Public and bundled native endpoints must agree',
);
assert.equal(native.pairCount, 30);
assert.equal(native.notANewExperiment, true);
console.log(
  JSON.stringify(
    {
      passed: true,
      scope: 'Recorded evidence integrity, not new model inference',
      reports,
    },
    null,
    2,
  ),
);
