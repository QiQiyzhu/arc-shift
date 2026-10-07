# v2.5 combat visual direction and evidence

This pass deepens ARC//SHIFT's arcane-ruins setting through authored procedural effects. The existing painted rooms, character atlas, and boss paintings remain in use. The new spell signatures, danger marks, projectile cores, and contact textures are code-drawn graphics or cached canvas textures; they are not newly commissioned or generated paintings.

## Visual language

Friendly spell energy uses muted cyan `#83E7DD`, ivory `#F5EBD3`, diamonds and inward spirals. Critical and empowered contacts use alchemical gold `#E8BC70`. Hostile releases, bullets and warnings use vermilion `#FF704F`, a warm edge `#FFC08A`, inward teeth, triangles and crossed centres. Existing projectile elemental colours remain in use inside this role language.

The friendly gravity well now has a quiet fixed boundary and six inward tendrils. The earlier nested purple ellipses are removed. Dash accents leave short directional strokes instead of another large ghost silhouette. Large cannon rounds retain their gameplay size, while their halo is tighter and their cores are faceted. Contact sprites are briefer and smaller; major spell releases receive one expanding seal instead of multiple overlapping generic rings.

Enemy warnings render in a dedicated depth-6 pass, above hostile projectile sprites at depth 5 and below floating text at depth 8. A dark-edged ivory player marker remains tied to the player's position. Hazard circles use the original centre and radius. Charge endpoints/contact widths, blast forecasts and laser geometry are unchanged. Telegraph borders do not pulse off; cross marks and teeth distinguish danger from a friendly circle without relying on hue alone. The moving inner arc on a windup is a final-second urgency accent, not a normalized timer for every enemy's different windup length.

## Timing, budgets and reduced effects

| Presentation | Lifetime or limit |
| --- | --- |
| Dash wake | 240 ms |
| Impact signature | 280 ms, with a brief ivory contact core |
| Skill pulse | 480 ms |
| Other seals / phase release | 550 ms |
| Signature pool | 40 normal / 10 simplified |
| Decorative particles | 360 normal / 72 simplified; previously 650 |
| Cached contact sprite pool | 64; previously 96 |
| Floating labels | Existing limit of 40 |
| Chain beams | Existing limits of 48 normal / 12 simplified |

Ordinary hits do not allocate an additional signature. Nearby simultaneous impact signatures coalesce. Expansion eases out and fragments decay rather than flashing repeatedly. Cosmetic noise uses a private xorshift stream and does not consume gameplay randomness.

Camera feedback is limited to impact, hurt and phase events, with at least 180 ms between impulses (400 ms after a phase event). Impact uses 45 ms / 0.0007 intensity, hurt 90 ms / 0.0022, and phase 140 ms / 0.0018. Critical hits alone do not shake the camera. There is no new fullscreen flash.

Either **Focused effects** or **Reduced motion** activates the simplified VFX path. It suppresses emitted camera impulses, dash wakes, decorative rotation and ambient motes, reduces contact particles and beam width, and keeps the player marker, hit confirmation and every threat boundary. Enabling simplification also trims live signature/particle decoration to its lower budget. The two fixed-fixture screenshots below enable both settings; the performance checks exercise each setting separately.

All game modes that use `ArcScene` receive the combat changes: main run, build trial, relay activity, and Frontier. Frontier's separate objective renderer and its interaction radii remain unchanged.

## Evidence and validation

The [normal](qa/v25/combat-normal.png) and [simplified](qa/v25/combat-reduced.png) images are **DEV presentation fixtures**, not ordinary-player screenshots: seed 73129, fixed 1280 × 720 camera, scene time 12 s, matching player/enemy/hazard positions, frozen simulation, and manually emitted existing effect events advanced by 50 ms. [Fixture state and disclosure](qa/v25/combat-fixture.json) record this method. They isolate readability; their diagnostic frame counters are not performance evidence.

The [native cannon screenshot](qa/v25/combat-native-cannon.png) comes from a separate 58.145-second capture using real menu, keyboard and pointer controls. It covers all three weapons in the built-in invulnerable practice mode, whose banner is visible. QA state is read-only in that recorder. It is automated play, not a human playtest. The capture finished with no page errors or failed action. [Capture metadata](qa/v25/combat-capture.json) and the [source manifest](qa/v25/combat-source-manifest.json) retain the recorder's original provenance. Its inherited `version: "2.3"` field identifies the older capture helper; these files record this v2.5 working-source pass, as identified by the source hashes. The WebM video and separately captured synthesized audio are separate files; the video must be labelled silent unless audio is explicitly muxed.

Two earlier takes reset after development-server reloads while UI/showcase files were being edited. They are retained in ignored `work/v25-vfx/after-weapons` and `after-weapons-final`. The successful frozen-source take is `work/v25-vfx/after-weapons-take3`; it is the source of the checked-in capture evidence.

Validation completed for this implementation:

- TypeScript typecheck and oxlint passed.
- 284 unit tests passed, including five new [VFX safety tests](qa/v25/combat-safety.json): allegiance classification, bounded pools and expiration, impact coalescing and reduced-mode wake removal, camera cooldown/disable rules, and unchanged danger radius/cross marks under reduction.
- Three browser tests passed: the real-menu return-blade practice journey and two replay tests. Recording, export, replay and final gameplay checksum agree.
- Three additional actual-renderer stress samples passed the decorative budgets, with no page errors and no projectile pool misses.

### Local render measurements

[Raw measurements and methodology](qa/v25/combat-performance.json) use headless Edge 154 on Windows, 1440 × 900 viewport, Intel UHD Graphics through ANGLE / Direct3D11. Each sequential sample ran the same seed-73129, 100-enemy high-HP DEV stress fixture for approximately ten seconds with scripted simulation inputs. Other agents could be active on the machine. CPU presentation time measures graphics submission, while frame time measures wall-clock `requestAnimationFrame` intervals.

| Mode | Frame p95 | CPU presentation p95 | Particle peak | Signature peak | Projectile pool misses |
| --- | ---: | ---: | ---: | ---: | ---: |
| Normal | 13.9 ms | 1.7 ms | 360 | 34 | 0 |
| Focused effects only | 7.1 ms | 1.5 ms | 72 | 10 | 0 |
| Reduced motion only | 14.1 ms | 1.7 ms | 72 | 10 | 0 |

These are local observations, not a controlled before/after speed comparison or a promised frame rate. The purpose is to verify a live simulation and bounded decoration; the variation between the two simplified samples illustrates why short shared-machine samples do not establish a universal performance claim.

## Implementation boundaries

Changes are confined to presentation in `src/effects/arcane.ts`, `particles.ts`, `bursts.ts`, `src/render/telegraphs.ts`, `actors.ts`, `projectile-sprites.ts`, and their `ArcScene` integration. Damage, collisions, cooldowns, attack scheduling, gameplay RNG, save contracts and production DEV isolation are unchanged. Existing shared skill events distinguish hostile producers using their explicit existing event signatures; future producers should extend that presentation mapping rather than infer allegiance from target coordinates.

The authored safety tests are in `tests/arcane-effects.test.ts`. The surrounding v2.5 UI, art-direction portfolio and final production build are separate parts of the release and have their own validation.
