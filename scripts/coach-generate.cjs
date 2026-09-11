// Authoring-time generation; credentials are read once from a non-echoing terminal.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
// oxlint-disable-next-line typescript/no-deprecated
require.extensions['.ts'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { facts, validateStrategy, GOALS } = require(
  path.resolve('src/coach/knowledge.ts'),
);
const { DEFAULT_CONTENT } = require(path.resolve('src/content/schema.ts'));
// Stage proposals separately: a new model run must not overwrite reviewed production prose.
const directory = path.resolve('outputs/coach');
const pools = {
  single: [
    'fire-ember',
    'fire-fuel',
    'storm-arc',
    'storm-critical',
    'storm-surge',
    'fire-meteor',
    'storm-lance',
    'ice-touch',
    'ice-brittle',
    'ice-pierce',
    'void-seek',
    'void-echo',
  ],
  swarm: [
    'fire-ember',
    'storm-arc',
    'fire-split',
    'fire-blast',
    'storm-conduct',
    'storm-needle',
    'fire-bloom',
    'void-horizon',
    'void-singularity',
    'ice-prism',
    'void-seek',
    'ice-touch',
  ],
  mobility: [
    'shift-quick',
    'shift-stride',
    'shift-reload',
    'storm-arc',
    'shift-echo',
    'shift-rear',
    'shift-ice',
    'ice-touch',
    'void-echo',
    'fire-ember',
    'void-seek',
    'ice-shell',
  ],
};
if (!process.stdin.isTTY)
  throw Error('Use a raw terminal for credential input');
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.resume();
let input = '';
console.log(
  'READY: credential accepted through non-echoing stdin; end with newline.',
);
process.stdin.on('data', async function receive(chunk) {
  if (chunk.includes('\u0003')) {
    input = '';
    process.stdin.setRawMode(false);
    process.exit(130);
  }
  input += chunk;
  if (!/[\r\n]/.test(input)) return;
  process.stdin.off('data', receive);
  process.stdin.pause();
  let key = input.trim();
  input = '';
  const receipts = [],
    plans = [];
  fs.mkdirSync(directory, { recursive: true });
  const write = () =>
    fs.writeFileSync(
      path.join(directory, 'generation.json'),
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          contentHash: crypto
            .createHash('sha256')
            .update(JSON.stringify(DEFAULT_CONTENT))
            .digest('hex'),
          receipts,
        },
        null,
        2,
      ),
    );
  try {
    const listing = await fetch('https://api.deepseek.com/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!listing.ok) throw Error(`Model listing HTTP ${listing.status}`);
    const models = (await listing.json()).data.map((m) => m.id);
    const model =
      models.find((m) => m === 'deepseek-v4-flash') ||
      models.find((m) => /flash/.test(m)) ||
      models.find((m) => m === 'deepseek-chat');
    if (!model) throw Error('No supported DeepSeek model advertised');
    console.log(JSON.stringify({ models, selected: model }));
    const knowledge = facts();
    for (const weapon of ['arc', 'sword', 'cannon'])
      for (const goal of Object.keys(GOALS)) {
        const ids = new Set(pools[goal]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const id of ids) {
            const need = DEFAULT_CONTENT.cards.find(
              (c) => c.id === id,
            )?.requires;
            if (need && !ids.has(need)) {
              ids.add(need);
              changed = true;
            }
          }
        }
        const context = knowledge.filter(
          (f) =>
            ids.has(f.id) ||
            (Array.isArray(f.requires) &&
              (!('weapons' in f) || f.weapons.includes(weapon)) &&
              f.requires.every((id) => ids.has(id))),
        );
        const prompt = `为ARC-SHIFT生成一套中文战术。武器 ${weapon}，目标 ${GOALS[goal].name}。只用检索事实中存在的ID，4到6张不同协议，并包含递归前置。引用2到6个在卡组里或已满足条件的共鸣事实ID。返回JSON对象，恰好有id,title,weapon,goal,cards,evidence,explanation,caution。id必须是${weapon}-${goal}，weapon=${weapon}，goal=${goal}。title中文不超过22字符，explanation和caution各不超过100中文字符，说明操作和一个真实代价。不虚构百分比、胜率、测试结果。禁止宣称必胜/最佳/已实测。回旋弹不会重复命中同一敌人。微型分裂弹不会再次分裂或触发反应。此处战斗固定步，无实时LLM。圣剑的第三斩齐射需要奥术形态；回旋与冰霜会把第三斩改为回收冰刃并失去近战扇面。形态修饰不自动发射副武器。微型弹能施加元素状态但不直接引出派生反应。重炮有自身倍率。检索事实：\n${JSON.stringify(context)}`;
        const schema = {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'title',
            'weapon',
            'goal',
            'cards',
            'evidence',
            'explanation',
            'caution',
          ],
          properties: {
            id: { type: 'string', enum: [`${weapon}-${goal}`] },
            title: { type: 'string' },
            weapon: { type: 'string', enum: [weapon] },
            goal: { type: 'string', enum: [goal] },
            cards: { type: 'array', items: { type: 'string', enum: [...ids] } },
            evidence: {
              type: 'array',
              items: { type: 'string', enum: context.map((f) => f.id) },
            },
            explanation: { type: 'string' },
            caution: { type: 'string' },
          },
        };
        let accepted;
        for (let attempt = 0; attempt < 2 && !accepted; attempt++) {
          const start = Date.now();
          const response = await fetch(
            'https://api.deepseek.com/beta/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                thinking: { type: 'disabled' },
                tools: [
                  {
                    type: 'function',
                    function: {
                      name: 'propose_strategy',
                      description:
                        'Propose a grounded tactical plan; cards can only contain card IDs, never synergy IDs.',
                      strict: true,
                      parameters: schema,
                    },
                  },
                ],
                tool_choice: {
                  type: 'function',
                  function: { name: 'propose_strategy' },
                },
                messages: [
                  {
                    role: 'system',
                    content:
                      'Use propose_strategy. Cards are executable protocols; synergies are evidence, never cards.',
                  },
                  {
                    role: 'user',
                    content:
                      prompt +
                      `\n可选择的协议ID: ${[...ids].join(',')}` +
                      (attempt
                        ? '\nPrevious candidate failed semantic validation. Recheck prerequisite and evidence membership carefully.'
                        : ''),
                  },
                ],
                temperature: 0.35,
                max_tokens: 1600,
              }),
              signal: AbortSignal.timeout(60000),
            },
          );
          if (!response.ok) throw Error(`Generation HTTP ${response.status}`);
          const body = await response.json();
          const choice = body.choices?.[0];
          const call = choice?.message?.tool_calls?.[0];
          const receipt = {
            weapon,
            goal,
            attempt,
            requestedModel: model,
            responseModel: body.model,
            latencyMs: Date.now() - start,
            usage: body.usage,
            finishReason: choice?.finish_reason,
            prompt,
            schema,
            toolName: call?.function?.name,
            response: call?.function?.arguments,
            accepted: false,
          };
          try {
            if (
              !['stop', 'tool_calls'].includes(choice?.finish_reason) ||
              call?.function?.name !== 'propose_strategy' ||
              choice.message.tool_calls.length !== 1
            )
              throw Error('Incomplete or unexpected tool call');
            accepted = validateStrategy(JSON.parse(call.function.arguments));
            if (
              accepted.weapon !== weapon ||
              accepted.goal !== goal ||
              accepted.id !== `${weapon}-${goal}` ||
              accepted.cards.some((id) => !ids.has(id))
            )
              throw Error('Output outside retrieved scope');
            receipt.accepted = true;
            plans.push(accepted);
          } catch (error) {
            accepted = undefined;
            receipt.validationError = error.message;
          }
          receipts.push(receipt);
          write();
          console.log(
            JSON.stringify({
              weapon,
              goal,
              attempt,
              accepted: receipt.accepted,
              latencyMs: receipt.latencyMs,
              usage: body.usage,
            }),
          );
        }
        if (!accepted)
          throw Error(
            `Two invalid candidates for ${weapon}/${goal}; existing library preserved`,
          );
      }
    fs.writeFileSync(
      path.join(directory, 'proposed-library.json'),
      JSON.stringify(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          models: [
            ...new Set(
              receipts.filter((r) => r.accepted).map((r) => r.responseModel),
            ),
          ],
          plans,
        },
        null,
        2,
      ),
    );
    console.log(
      `Staged ${plans.length} structurally valid proposals in outputs/coach; source review required before replacing the production library.`,
    );
  } catch (error) {
    console.error(String(error.message).split(key).join('[REDACTED]'));
    process.exitCode = 1;
    write();
  } finally {
    key = '';
    process.stdin.setRawMode(false);
  }
});
