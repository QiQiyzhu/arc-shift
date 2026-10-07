# Dependency audit and exposure

The 2026-09-10 audit of the pre-M7 lockfile reported six affected package entries: two moderate entries for Vitest/mocker and four high entries along the sharp → miniflare → Wrangler/Vite-plugin dependency chain. Package counts are not six distinct independently exploitable application vulnerabilities.

- Vitest is pinned to 4.1.11, the maintained 4.x fix for [GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9). Its advisory concerns mock redirect file access in development servers. ARC runs Node tests and does not expose the standalone mocker plugin.
- The September repair used a narrow npm override to select sharp 0.35.4 for [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). The October cleanup below removes that unused scaffold dependency chain and its override entirely.

## 2026-10-07: release dependency cleanup

The [October 5 scheduled verification](https://github.com/QiQiyzhu/arc-shift/actions/runs/37297861270) stopped at `npm audit --audit-level=moderate`, reporting 16 affected package entries. The run was triggered by the existing weekly schedule, not by a player visiting the game. The unchanged commit had passed the September 28 scheduled check; audit results can change when advisories are published.

ARC-SHIFT builds static browser assets with Vite, React and Phaser. Source/configuration inspection found no runtime or build use of `vinext`, `react-server-dom-webpack`, the `shadcn` CLI, Cloudflare's Vite plugin/workers types/Wrangler, the Sites Vite plugin, or the React Server Components Vite plugin. These unused scaffold dependencies were removed from the manifest and lockfile. The imported UI component libraries remain installed. Removing the unused chains also removes their `braces`, `undici`, `sharp`, `ip-address`, and `fast-uri` dependency exposure.

A fresh audit additionally identified issues in the formatter's `tinypool` dependency and `source-map-js`. The formatter is now pinned to `oxfmt` 0.72.0, which resolves `tinypool` 2.2.0; `source-map-js` was updated within its existing compatible range to 1.2.2. No audit severity thresholds or checks were relaxed.

`npm ci` and a subsequent full `npm audit --json` completed successfully on Node 24.16.0 / npm 11.13.0, reporting zero known vulnerabilities. The timestamped change is accompanied by [the audit report](qa/engineering/audit-v24.json). This is a registry observation at verification time, not a guarantee against future advisories.

The workflow now records the source/environment before dependency installation and captures installation/audit logs in the always-uploaded verification artifact. A future audit failure will retain those diagnostics. Its checkout, Node setup and artifact actions use their Node 24-based v7 releases; the weekly dependency check remains enabled.

The public application is static HTML/JS/assets. It does not run Wrangler, miniflare, sharp or a Vitest server, and has no user-upload image processing endpoint. That deployment boundary does not excuse vulnerable developer dependencies; CI now audits the entire lockfile at moderate severity and above. A clean audit is only a timestamped registry observation, not proof that every dependency or application path is secure.

Verification records are stored under `docs/qa/engineering`. Review the actual audit JSON and full stage outputs for the final revision; do not infer passing results from this remediation description. The production browser check additionally verifies that QA/debugger/editor controls are not exposed by the built application.
