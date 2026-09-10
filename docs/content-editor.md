# Content workbench

Run `npm run dev` and open `/dev/content-editor`. The entry point is gated by `import.meta.env.DEV`; production builds do not import this editor, the replay viewer or their controls. It is a local engineering tool, not a public mod execution service.

## Workflow

1. Select Enemies, Weapons, Protocols, Encounters or Boss phases, then a stable record ID.
2. Change a numeric field or a supported reference. Controls display the same ranges used by import/runtime validation.
3. Inspect the semantic diff against the last applied pack. Invalid drafts show errors and cannot be applied or exported.
4. Apply resets an isolated real Engine at tick 0. Run the canvas, spawn a configured enemy, change weapon/forms, select protocols/relics and restart a build. No live player save is read or written.
5. Export the normalized JSON. Import it on another development checkout with the same schema and catalog. Raw JSON edits remain visible when invalid; restoring the built-in draft is explicit.

`src/content/schema.ts` defines the closed schema, defaults, bounds, parser and diff. Unknown fields/IDs, duplicate IDs, incomplete catalogs, nonfinite values, invalid integers, missing values, invalid references, prerequisite cycles and reversed Boss thresholds are rejected. The input is limited to 256 KiB. Valid records are sorted into canonical catalog order, copied and frozen before an Engine accepts them. Applying is atomic at the Engine-instance boundary.

## What the values actually control

| Category | Live consumers | Bounds of the feature |
|---|---|---|
| 12 enemies | World.spawn HP, speed, damage, radius | Existing scaling and elite multipliers still apply |
| 3 weapons | Attack damage, cooldown, projectile speed; sword range/arc; cannon blast | Original attacks/combos/support behavior stay in code |
| 40 protocols | Numeric deriveStats operations and reward prerequisites | Flags, triggered reactions, shields/HP, synergies and descriptions remain code-defined |
| Standard encounter | Base spawn pool/count, elite bonus, wave interval and pilgrimage wave counts | Existing late-room/biome additions remain; legacy wave counts and training infinity remain |
| 4 Bosses | HP phase thresholds and transition recovery | Pattern state machines/telegraphs remain typed code |

The card numeric operations preserve their previous order, so default floating-point values remain exact. `ice-touch` takes precedence when both slow-setting protocols are present. Sword arc is bounded at a full circle. Schema fields only appear on weapon forms that consume them. Protocol prerequisite edits apply to normal generated offers; fixed starting choices remain the curated onboarding set. Sandbox build selection deliberately bypasses unlock/prerequisite restrictions so combinations can be inspected.

The workbench changes a complete sandbox pack, not shared module globals. Engine resets, start, checkpoint resume and practice preserve that engine's content dependency. Default gameplay continues to use the immutable built-in pack. Descriptions are not automatically rewritten to reflect experimental numbers; read the field and stat inspector when tuning.

## Replay compatibility

The content version is `builtin-2026-09-10-tuning1`. Current replay files identify the built-in catalog; recording rejects custom content instead of falsely replaying a different tuning pack. A normalized default import is allowed. No custom-pack replay format or historical code download is implemented. The content dependency participates in the state checksum.

## Verification

Nine dedicated unit tests cover parsing/references/cycles/bounds, immutable ownership, canonical ordering, actual enemy/weapon/card/encounter/Boss consumers, save-resume propagation and replay rejection. A fixture executes 500 deterministic protocol/relic/level combinations and compares the exact aggregate SHA256 against pre-extraction code from commit `434ea9a` (`812ecf8db5844c8c49d18c086187b236e904a6f72481a4e6884bfaeb88d4f651`). It checks unchanged defaults, not whether experimental tuning is fun or balanced.

Two real browser tests exercise numeric editing, invalid-state blocking, diff, spawn values, card effect readout, JSON download/reimport, sword build restart, running/pausing the canvas, malformed JSON recovery and untouched storage. The full five-check milestone gate is recorded under `docs/qa/engineering/m4-content/`; its actual status is authoritative.

No external image, script, remote URL, executable behavior or arbitrary new ID can be loaded through this JSON format. Adding a new enemy or reaction still requires code, schema/catalog changes and validation.
