# Repository Boundaries

## Canonical scope
This repository is the active canonical workspace for the Amline platform.

## Primary areas
- `admin-ui/`, `amline-ui/`, `site/`: user-facing applications
- `backend/`, `dev-mock-api/`, `pdf-generator/`: service layer
- `docs/`, `scripts/`, `.github/`: operational support

## Secondary or support areas
Directories such as `Figma/`, `Agent/`, `ai-video-directory/`, `browser-live-control/`, `channel-gateway/`, `vpn-setup/`, and archived-style technical document bundles should be treated as supporting material, not as an invitation to keep expanding the root without boundaries.

## Rules going forward
- New runtime code should land in product apps, services, or packages.
- Cross-repo experiments should not be copied wholesale into this monorepo.
- Generated exports, QA recordings, and deploy bundles should not be committed.
- If a sub-area needs an independent release cadence, it should be split into its own repository instead of broadening the monorepo root.
