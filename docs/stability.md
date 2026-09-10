# Stability and automated verification

The engineering gates retain raw output, failed attempts and later passing runs under `docs/qa/engineering`. Each milestone runs typecheck, lint, the complete unit suite, the complete development browser suite and a production build before the next milestone starts. Tests are AI-assisted authored contracts; they are not evidence of independent player research.

## Long-running simulation

`npm run test:soak -- --long` executes six fixed seeds × 108,000 ticks at 60 Hz: 30 minutes **simulated time per seed**, three hours in aggregate. It does not wait three wall-clock hours. The real mixed weapon and enemy systems run in an invulnerable training fixture with 28 high-HP enemies. It checks finite state, exact tick progression, pool capacity and bounded enemies/hazards/pickups every 600 ticks and on the final tick. It samples process heap and reports elapsed wall time, entity peaks, pool misses and final canonical checksums.

The 2026-09-10 final local run completed all 648,000 ticks. Every seed retained 28 enemies; projectile peaks were 161–169, hazard peaks 17, and projectile pool misses zero. Wall time per seed was 6.04–15.48 seconds on this loaded Windows host. Raw evidence: [soak-long.json](qa/engineering/soak-long.json). The earlier run before the review added final-tick invariants is retained separately. Identical final checksums across both runs are a reproducibility observation, not a benchmark improvement.

Heap snapshots include allocator and garbage collector behavior and concurrent host workloads. No retained-object count, heap-growth bound or browser leak-free claim is made. This fixture does not test three real-time hours of rendering/audio, progression balance, saving every room, or all builds. `npm run test:soak` provides a three-seed × 3,600-tick CI smoke.

## Regression contracts

- Twelve seeded new-run simulations check finite state, pool bounds, save normalization idempotence and valid checkpoint resumption across 21,600 additional ticks.
- Three committed replay histories cover ordinary combat/skills, Boss introduction with pause, and shop/resource/route decisions. Tests play these histories unchanged and check their recorded hashes. Regeneration is an explicit reviewed command (`node scripts/replay-fixtures.cjs --write-reviewed-fixtures`), never a test setup step. These are authored scenarios, not player recordings.
- Four save compatibility tests cover the original version-1 shape, economy-era resources, pilgrimage graph reconstruction and corrupt legacy rooms. A malformed Boss reference previously passed ordinary save loading and could crash on resume. It now invalidates only that checkpoint, preserving valid meta progression and settings. Replays reject the same malformed profile earlier at this shared validation boundary.
- Existing content schema tests reject invalid bounds, IDs, cycles and references; spatial-grid randomized tests retain the brute-force oracle, high-speed sweeps and whole-engine comparisons. They remain part of every full unit run.

## CI and production acceptance

[GitHub Actions](../.github/workflows/ci.yml) runs locked installation, typecheck, lint, all unit contracts, short soak, production build, bundle measurement and actual Chromium acceptance for every push/PR. The normal browser subset covers `game.spec.ts` and `replay.spec.ts`; a weekly scheduled/default-branch run or manual `full_suite` dispatch runs the complete browser suite and long soak. This split avoids repeating multi-scene timed stress captures on every documentation push; local milestone acceptance still runs every browser scenario. Each job has a 35-minute limit and one browser worker. Raw logs, fresh reports, traces and the exact built artifact are uploaded with the tested source SHA.

The production browser test loads the built application, starts a run, and checks that `?qa` and development routes expose no QA object or tool interface. `npm run bundle:report` measures every emitted file, raw and locally compressed text sizes, validates non-empty HTML/JS and scans development markers. Compression estimates are not observed HTTP transfer sizes; marker scanning alone is not a security proof. Run it after `npm run build`.

The original M6 full gate initially failed one replay assertion because the new shared save validator rejected a malformed Boss before the old replay-only validator. The rejection remained correct; its regression now expects the earlier precise error. Remote CI results are only claimed once a published run has actually passed.

M6 local milestone evidence: [five checks](qa/engineering/m6-stability-final/checks.json), 136/136 unit tests, 32/32 development browser tests (zero skipped/flaky), and an additional 1/1 built-production browser acceptance. At that milestone the measured production output was 3,073,830 bytes total, including 1,664,223 JavaScript bytes; `bundle.json` is refreshed for later releases and must be read with its timestamp.

M7 extends push/PR smoke to `input.spec.ts`, covering rebinding, standard gamepad actions and focus/disconnect safety. It also adds a moderate-or-higher dependency audit gate. The first Linux run (34447501573) failed 5 of 7 browser smoke tests while compilation, unit, soak and production acceptance passed. Software rendering exposed an additional Phaser delta smoother and test fixtures with incomplete blur/focus pairs or fixed waits. Its raw report is preserved; subsequent results must be checked separately.
