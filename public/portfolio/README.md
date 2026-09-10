# Public portfolio assets

This directory is the public showcase for five separate repositories. The actual ARC game remains at the origin root. The other projects are represented by real application media, source, verification records and independently reproducible local applications; this static page does not run their backends.

- `index.html` and `assets/*.css` / `viewer.js`: authored static presentation and an accessible native-dialog media viewer, with no remote script, analytics or API dependency.
- `assets-manifest.json`: byte size, SHA256, repository-relative origin and source reference for every copied original screenshot/recording. Recordings load on request.
- `handbooks/`: A–T dossiers rendered from each repository's `docs/interview-dossier.md`. The manifest records the original local byte hash (`dossierSha256`) and the UTF-8/LF normalized hash (`dossierNormalizedSha256`, portable across Git line-ending conversion), plus Mermaid source/render statistics. Diagrams are inline SVG; pages can be saved and read offline.

The Desktop copies and their original local generator are maintained beside the five workspaces. Public output contains no machine filesystem paths, secrets or local administration endpoints. Sources and actual evidence remain in the respective GitHub repositories.

The production Playwright suite verifies the five project links, all twenty chapters per dossier, diagrams, media open/close/focus and responsive entry. Offline dossier verification additionally checks original graph relations, document hashes, anchors, overflow and absence of network requests. These presentation checks do not substitute for backend, game or Unreal runtime acceptance.
