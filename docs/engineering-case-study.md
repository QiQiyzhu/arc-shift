# ARC//SHIFT: preserving gameplay while making it measurable

This case study concerns the engineering update to an existing playable game. It does not claim a new ECS, multiplayer architecture, a rendering speedup or independent player research. Implementation, tests and documentation were AI-assisted; the submitter must personally reproduce and understand the evidence before adopting first-person resume wording.

## Problem

Mixed weapons and chained effects increase the number of moving projectiles and enemies. The existing projectile loop examined every enemy, and enemy separation examined almost every pair. Changing those loops could also change damage order, knockback, RNG consumption and subsequent gameplay. A faster loop that silently changes a build is a regression.

The project also lacked a reproducible input history, a safe way to inspect tuning changes, and enough separation between physical input and the fixed simulation. These gaps made it harder to explain failures than to add another card or Boss.

## Evidence

The baseline uses seed 73129, 300 warm-up updates and 1,500 measured 1/60-second updates with the real rules. At 250 enemies, Engine P50/P95/P99 were 0.9820/1.8786/2.3040 ms. These are Node simulation measurements on one Windows host; they exclude the renderer and are subject to host scheduling.

The first Grid implementation reduced geometric work but made the 250-enemy P95 worse: 4.135 ms. Repeated membership maintenance, allocation and sorting outweighed the saved tests. We retain [that failed sample](qa/engineering/engine-spatial-first.json), the [baseline](qa/engineering/engine-baseline.json), [final sample](qa/engineering/engine-spatial-final.json), and [comparison](qa/engineering/spatial-comparison.json).

## Alternatives

| Option | Benefit | Why it was not the first change |
|---|---|---|
| Keep brute force | Small, reliable reference implementation | Work grows with projectile × enemy count and enemy pairs |
| Quadtree / BVH | Can suit uneven density or different body sizes | Moving-body maintenance and traversal add complexity without evidence this bounded arena needs them |
| Replace the architecture with ECS | Potential component-query and layout control | Broad migration changes more behavior than the measured hotspot requires |
| Uniform Grid | Short insertion/query rules, conservative candidates | Still needs stable order, multi-cell circles and correct dynamic updates; dense cells can degenerate |

Brute force remains selectable as an oracle, so the optimization can be checked against the prior algorithm instead of against its own expectations.

## Design

A 96-unit uniform cell index stores every cell touched by an enemy circle's AABB. A projectile queries the AABB of the full movement segment expanded by projectile radius. The existing segment/circle narrow phase remains authoritative. Candidate order follows the original enemy array, not numeric IDs or Map traversal accidents.

Knockback updates membership immediately. Separation retains candidates while occupied cell bounds stay unchanged, and only re-queries after a cell change, continuing after the already processed pair. This preserves the original sequential arithmetic while avoiding redundant maintenance. It is a derived index, not a second source of gameplay state.

Replay records actual fixed-step inputs and one ordered stream of decisions and their results. Content tools validate, copy and freeze a complete parameter pack before creating an isolated Engine. Both tools disable gameplay persistence. Physical keyboard/mouse and standard gamepad snapshots resolve into the same action contract consumed by the existing simulation.

## Implementation

- [spatial-grid.ts](../src/core/spatial-grid.ts), [separation.ts](../src/combat/separation.ts), [projectiles.ts](../src/combat/projectiles.ts): conservative broad phase, stable order and original hit rules.
- [replay.ts](../src/replay/replay.ts): versioned initial state, ordered commands/results, resource limits and periodic canonical-state checksums. FNV-1a 32-bit is diagnostic, not cryptographic.
- [schema.ts](../src/content/schema.ts), [ContentEditor.tsx](../src/dev/ContentEditor.tsx): existing enemy, weapon, protocol, encounter and Boss parameters; validation, diff and real sandbox consumers. Special behavior stays in code.
- [debug-session.ts](../src/dev/debug-session.ts), [Debugger.tsx](../src/dev/Debugger.tsx): controlled stepping, metrics and drawing overlays without making debug metrics authoritative.
- [actions.ts](../src/input/actions.ts), [scene.ts](../src/game/scene.ts): held levels versus rising edges, 144 Hz input retention, fixed-step consumption, rebinding, focus and disconnect behavior.
- [CI](../.github/workflows/ci.yml), [soak.cjs](../scripts/soak.cjs), [save.ts](../src/core/save.ts): locked dependencies, real browser acceptance, bounded simulation and checkpoint compatibility.

## Verification

Spatial tests compare randomized layouts and real Engine outcomes against brute force, including large radii, negative coordinates, high speed, piercing, knockback and secondary effects. The final 28/100/250-enemy samples preserve final position/HP arrays, total damage and RNG state. Content extraction preserves the exact aggregate output hash of 500 pre-extraction builds. Replay has committed combat, Boss and shop/route histories and rejects malformed or incompatible data.

Every milestone runs typecheck, lint, all unit tests, the full development browser suite and build. Production acceptance is separate: it starts the actual built game and checks that QA/editor/debug tools are absent. Long simulation runs six seeds × 108,000 updates, with finite-state, tick, entity and pool invariants; it represents three hours of aggregate **simulated** time, not a three-hour browser session. See [current verification ledger](qa-report.md) for counts and exact run links.

Two classes of failure matter. The first Linux browser run failed five smoke scenarios: software rendering exposed duplicate Phaser delta smoothing and tests with fixed waits or incomplete synthetic blur/focus sequences. Separately, actual input tests caught an unmapped Space activating a previously focused Continue button. These required different repairs: timing ownership, state-based assertions, and browser input suppression. Passing a Node test would not have found the focused-button problem.

## Result

| 250-enemy fixed workload | Before | After |
|---|---:|---:|
| Engine P50 | 0.9820 ms | 0.7757 ms |
| Engine P95 | 1.8786 ms | 1.0712 ms |
| Engine P99 | 2.3040 ms | 1.2339 ms |
| Separation narrow-phase test count | Baseline | 92.53% fewer |
| Projectile narrow-phase test count | Baseline | 97.68% fewer |

These are real samples, not universal speedup guarantees. The browser measurements show **no consistent FPS gain**: 28 enemies regressed, 100 was broadly unchanged, and 250 improved average FPS slightly with worse P95 frame time. The useful outcome is both a measured simulation improvement and a clearer set of tools for finding the remaining cost. [Full measurements and reproduction](performance-v2.md).

## Remaining limitations

Grid query/insert allocation and sorting are now visible hotspots. Homing, melee and chain queries are not all indexed. Dense clustering can approach brute-force work. Rendering needs longer isolated multi-device profiling; no stable-60-FPS or browser leak-free claim is justified. Replay is constrained to compatible code/content/runtime behavior, rejects custom tuning, and has no network lockstep or historical-code loader. Gamepad integration is tested through controlled browser API snapshots; physical controllers and controller-only menu navigation remain unverified. Real player balance, usability and audio fatigue require actual feedback.

The detailed [A–T dossier](interview-dossier.md) contains ten core files, five UI files, ten code explanations, twenty follow-up questions and five evidence-bounded resume drafts.
