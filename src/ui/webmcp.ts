import type { Engine } from '../game/engine';
import { roomChoices } from '../rooms/generator';
import { availableNodes } from '../rooms/expedition';
interface MCP {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function installWebMCP(engine: Engine) {
  const context = (document as Document & { modelContext?: MCP }).modelContext;
  if (!context) return () => {};
  const life = new AbortController();
  const snapshot = () => {
    const w = engine.world;
    return {
      phase: w.phase,
      room: w.room.index,
      health: Math.ceil(w.player.hp),
      kills: w.kills,
      protocols: w.cards,
      forms: w.forms,
      campaign: w.campaign,
      route: w.route,
      choices:
        w.phase === 'reward'
          ? w.rewards.map((c) => ({
              id: c.id,
              name: c.name,
              effect: c.preview,
            }))
          : w.phase === 'map'
            ? w.campaign === 'pilgrimage'
              ? availableNodes(w.seed, w.room.nodeId!)
              : roomChoices(w.room.index + 1, w.seed)
            : [],
    };
  };
  const register = (
    name: string,
    description: string,
    properties: object,
    required: string[],
    readOnlyHint: boolean,
    execute: (input: unknown) => unknown,
  ) => {
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name,
            description,
            inputSchema: {
              type: 'object',
              properties,
              required,
              additionalProperties: false,
            },
            annotations: { readOnlyHint },
            execute,
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser integration must never block play. */
    }
  };
  register(
    'read_run_status',
    'Read current ARC SHIFT run, health, acquired protocols and available choices.',
    {},
    [],
    true,
    () => snapshot(),
  );
  register(
    'pause_run',
    'Pause or resume the current ARC SHIFT run, including room introductions. Does not start or restart a run.',
    { paused: { type: 'boolean' } },
    ['paused'],
    false,
    (input) => {
      const v = input as { paused?: unknown };
      if (typeof v?.paused !== 'boolean') throw Error('paused must be boolean');
      if (
        !['playing', 'transition', 'bossIntro', 'paused'].includes(
          engine.world.phase,
        )
      )
        throw Error('Combat is not active');
      if (v.paused !== (engine.world.phase === 'paused')) engine.pause();
      return snapshot();
    },
  );
  register(
    'select_protocol',
    'Choose one of the three offered protocols on the reward screen.',
    { id: { type: 'string' } },
    ['id'],
    false,
    (input) => {
      const id = (input as { id?: unknown })?.id;
      if (typeof id !== 'string' || !engine.chooseCard(id))
        throw Error('This protocol is not an available reward');
      return snapshot();
    },
  );
  return () => life.abort();
}
