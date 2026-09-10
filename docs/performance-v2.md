# Spatial index: measured engineering change

Recorded 2026-09-10 on the Windows machine identified in the raw JSON. This is a fixed-seed stress fixture, not a claim about all hardware or normal player sessions. Other portfolio agents were active. Node measures the simulation; Chromium measures the actual renderer. The first implementation regressed and is retained in `qa/engineering/engine-spatial-first.json`.

## Why a uniform grid

The arena is bounded and most enemies have similar small radii. A 96-unit cell provides a short, inspectable insertion/query implementation. Each circle occupies **all** cells touched by its AABB, including negative coordinates; a projectile queries the AABB of its entire swept segment plus projectile radius. Existing segment/circle narrow-phase damage logic remains authoritative. Quadtree subdivision and BVH refitting would add maintenance and traversal complexity for moving bodies without evidence that this small scene needs them. Very uneven density, huge worlds or widely varying body sizes would justify measuring those alternatives.

The grid stores source-array order, not ID order. This preserves piercing, RNG consumption and the original sequential separation arithmetic. Knockback updates membership immediately. Separation re-queries only when the current body's occupied cell bounds change, then continues after the last processed pair. Moving inside unchanged cells cannot reveal a body outside the existing conservative candidate set. Bosses retain the original separation exclusion. Homing target selection, chain reactions and melee queries remain linear; this change does not claim to index every system.

## Fixed simulation before / after

Seed 73129, 300 warm-up ticks + 1,500 measured ticks, 60 Hz, real enemy logic and mixed weapons, high enemy HP. `engine-baseline.json` versus `engine-spatial-final.json`. All three final enemy position/HP arrays, total damage and RNG states are exactly equal. `scripts/summarize-performance.cjs` asserts equality and produces the comparison JSON.

| Enemies | Separation tests reduced | Projectile tests reduced | Engine P50 ms before → after | P95 ms | P99 ms |
|---|---:|---:|---:|---:|---:|
| 28 | 90.45% | 96.71% | 0.0771 → 0.0567 | 0.1753 → 0.1188 | 0.4443 → 0.2371 |
| 100 | 90.52% | 97.12% | 0.3170 → 0.2161 | 0.6229 → 0.3609 | 0.8468 → 0.5404 |
| 250 | 92.53% | 97.68% | 0.9820 → 0.7757 | 1.8786 → 1.0712 | 2.3040 → 1.2339 |

Query counts are deterministic for these inputs; wall-clock timings are noisy samples. No confidence interval or universal speedup is claimed. Peak projectile counts match at 145 / 207 / 376, with zero pool misses. Heap snapshots are available in the raw data, but snapshots with different GC schedules cannot establish allocation savings; object count is `unavailable`.

## What the failed first attempt taught us

Initially, 250-enemy P95 increased to 4.135 ms despite fewer narrow-phase tests. Removing/reinserting cell membership after every small push and allocating/sorting a fresh query after every overlap dominated the saved work. Caching occupied bounds and retaining candidates until a cell change removed most of that overhead. Sorting cached entries by numeric order also avoided repeated Map lookups inside the comparison function. We keep both measurements, rather than selecting only the successful run.

## CPU evidence and remaining bottleneck

`spatial-comparison.json` contains V8 CPU samples from both current-code modes. The brute profile spends about 30.1% self time in `distance`, 14.3% in the brute separation loop and 13.7% in `segmentHits`. The grid profile shifts to `query` (37.9%) and `insert` (12.9%); `distance` drops to 3.9% and `segmentHits` to 0.94%. Profiles include startup/TS compilation and all workloads; samples and inlining do not give exact per-function costs. Profiled timings are separate from the unprofiled table.

The grid still allocates Sets/arrays and sorts candidates. Very dense cells approach the original pair complexity; optimizing this further requires a fresh measurement and the same correctness oracle. The browser also spends time drawing geometry/effects and in React/Phaser, so a simulation improvement does not imply stable 60 FPS.

## Reproduce

```powershell
npm ci
node scripts/benchmark.cjs current-grid
$env:ARC_COLLISION_MODE='brute'
node scripts/benchmark.cjs current-brute
Remove-Item Env:ARC_COLLISION_MODE
npx vitest run tests/spatial-grid.test.ts
$env:ARC_BENCH_LABEL='current'
npx playwright test e2e/engineering-performance.spec.ts
```

CPU profiles: add `--cpu-prof --cpu-prof-dir=outputs/qa --cpu-prof-name=grid.cpuprofile` (or `brute.cpuprofile`) before the script name. Raw profiles contain local paths and are ignored; the checked-in aggregate preserves measurement evidence.

## Actual browser sample: no consistent FPS gain

Headless Edge 152, 1440×900, actual Phaser renderer, 10 seconds per scene. Before: `browser-baseline-{28,100,250}.json`; after: `browser-spatial-final-{28,100,250}.json`.

| Enemies | FPS before → after | Frame P50 ms | Frame P95 ms | Frame P99 ms | Engine P95 ms |
|---|---:|---:|---:|---:|---:|
| 28 | 61.04 → 50.64 | 13.9 → 20.8 | 27.8 → 34.7 | 34.8 → 41.7 | 0.9 → 1.1 |
| 100 | 33.79 → 32.66 | 27.8 → 27.8 | 55.5 → 55.5 | 62.5 → 62.4 | 1.3 → 1.2 |
| 250 | 21.55 → 23.12 | 41.7 → 34.9 | 76.4 → 83.3 | 97.1 → 90.3 | 2.2 → 1.8 |

The 28-enemy browser sample regressed, 100 was broadly unchanged, and 250 had a small average increase with a worse P95 frame time. This is **not a demonstrated consistent rendering speedup**. Concurrent work and short sampling limit attribution; these numbers must not become a “stable 60 FPS” resume claim. The scene clamps elapsed time at 50 ms, so slow frames advance fewer simulation ticks. Browser query totals/peak projectile counts therefore cannot be compared as equivalent fixed-tick workloads; use the Node fixture for the deterministic query reductions. A longer isolated multi-device rendering investigation remains open.
