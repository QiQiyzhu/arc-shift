# Deterministic QA replay

This is a **single-process QA simulation replay**, not network lockstep, a video recorder, an anti-cheat system or a cross-platform determinism guarantee. The normal game still runs its existing fixed 60 Hz rules. The development page is `/dev/replay` after `npm run dev`. Production removes the page's dynamic import.

## Reproduce a report

1. Open `/dev/replay`, choose a seed and **Record new run**. The page owns an isolated Engine with a cloned profile and persistence disabled; the real save is not read or written.
2. Choose the starting protocol. Play using the usual keyboard/mouse actions. Reward, route, event, shop, chest, bank, reroll and pause buttons are recorded in order.
3. **Stop recording → Export JSON**. Import the file or **Load recording**, then use **Play / Pause / Step / ×1 / ×2 / ×4**.
4. Tick, canonical checksum and entity counts are visible. A mismatch stops playback and reports the first failing checkpoint's tick, event index, expected value and actual value. Checkpoints normally occur every 120 updates, so this identifies an interval, not necessarily the exact first divergent arithmetic operation.

The API also supports a validated checkpoint starting position, used by tests for Boss, reward, map and event states. The browser's Record button starts a fresh run. Mid-combat snapshots, arbitrary seeking, edited-content replay and network synchronization are not advertised as supported.

## Contract and ownership

`ReplayRecorder` stores the initial seed, replay/game/content versions, exact timestep, checkpoint interval, an immediate clone of the initial save and a single ordered event array. Inputs are copied at each actual Engine update, before the scene clears one-shot keys for catch-up steps. Each event has its simulation boundary tick; array index is the total order. Multiple decisions at the same tick are never sorted by timestamp.

`Engine.decision` runs a public decision's existing implementation, then records its boolean result (or null for pause). Playback compares that result as well as subsequent state. An insufficient-funds attempt is reproducible as a rejected attempt; silently converting it into a successful purchase is detected. Nested implementation calls such as `resolveEvent → addForm` are not recorded twice. Menu unlock/equip/preparation choices belong to the initial profile. A new start/resume closes an attached recording before resetting the simulation.

`World.tick` counts scheduled Engine updates, including no-op updates during a game pause or reward screen; `elapsed` continues to mean active gameplay time. Viewer pause stops the driver entirely, while the recorded **Game pause** command is part of simulation history. Playback ignores live mouse/key input, ESC, blur and visibility-driven game pause. Unmount destroys Phaser and removes window/document listeners. The existing menu preview is explicitly skipped in the QA canvas.

## Canonical state

Object keys are sorted; arrays and Sets preserve insertion order. Floating-point values are not rounded, and negative zero is distinguished in simulation state. The recording seed normalizes negative zero before JSON export. The canonical state includes every enumerable gameplay World field, RNG's current internal seed, entity IDs, all projectile pool slots (including inactive contents), allocator cursor, private Engine settlement/resume state and progression/checkpoint data.

Excluded: event subscribers, the derived spatial index, collision-mode switch and diagnostic query counters. These do not decide hits or progression. Visual particles and audio scheduling are presentation-only and may differ; simulation replay is not pixel-identical playback.

The checksum is FNV-1a 32-bit over the canonical JSON. It is a fast diagnostic consistency signal with a nonzero collision probability, **not a cryptographic integrity proof**. Tests also use exact full-state comparisons for spatial equivalence. The supported determinism envelope is the same code/content version and JS runtime behavior. Different engines/platforms can implement transcendental floating-point functions differently; this has not been exhaustively tested.

## Import and resource boundaries

The importer validates versions, a 1/60 timestep, finite bounded inputs, event ordering, command types/results, checkpoint structure, legacy room behavior references and boundary/periodic checksums. Save migration is followed by an equality check so malformed replay data is not silently “repaired” into another run. Initial profiles also have depth, count, string and number limits.

Limits: 32 MiB UTF-8 JSON, 108,000 updates (30 minutes of scheduled 60 Hz ticks), 250,000 events, 64 decisions and at most two checksums at a single boundary. Compact export and an encoded-byte budget keep a completed recording prefix importable; a limit closes recording before the next unrecorded input/decision. Duplicate periodic/final checksum at the final tick is valid. A checksum flood is rejected before the synchronous player begins. No model, file-system command or network execution occurs on replay import.

## Verification and known limits

`tests/replay.test.ts` covers 17 cases, including combat/Dash/Q/E, Boss intro pause, all four checkpoint starting phases, zero-tick ordered reward/shop/bank/route decisions, key/bomb chests, storage isolation, pool cursor and Set order, tampered inputs, command outcomes, malformed versions/room data, checksum flooding, negative-zero seed, per-tick caps, and a real 108,000-update fractional-pointer serialization round trip. `e2e/replay.spec.ts` runs actual keyboard/mouse recording, download, playback at ×4, single-step, blur/ESC isolation and bad import recovery.

A rules or content change must bump its compatibility identifier. There is no historical-code loader: old incompatible recordings fail visibly. The saved file is an input/decision stream, not a mutable world snapshot. Replaying thousands of commands is bounded but not intended as an untrusted public service. Future work can add a checkpoint diff viewer, cross-runtime CI samples, compressed input deltas and a runtime content digest when edited content is supported.
