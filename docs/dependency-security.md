# Dependency audit and exposure

The 2026-09-10 audit of the pre-M7 lockfile reported six affected package entries: two moderate entries for Vitest/mocker and four high entries along the sharp → miniflare → Wrangler/Vite-plugin dependency chain. Package counts are not six distinct independently exploitable application vulnerabilities.

- Vitest is pinned to 4.1.11, the maintained 4.x fix for [GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9). Its advisory concerns mock redirect file access in development servers. ARC runs Node tests and does not expose the standalone mocker plugin.
- A narrow npm override selects sharp 0.35.4 for [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). This updates the image library without accepting the audit command's suggested broad downgrade of Cloudflare tooling. The scaffold dependencies remain present. The override should be removed after upstream consumers require a patched version, with a fresh locked install and verification.

The public application is static HTML/JS/assets. It does not run Wrangler, miniflare, sharp or a Vitest server, and has no user-upload image processing endpoint. That deployment boundary does not excuse vulnerable developer dependencies; CI now audits the entire lockfile at moderate severity and above. A clean audit is only a timestamped registry observation, not proof that every dependency or application path is secure.

Verification records are stored under `docs/qa/engineering`. Review the actual audit JSON and full stage outputs for the final revision; do not infer passing results from this remediation description. The production browser check additionally verifies that QA/debugger/editor controls are not exposed by the built application.
