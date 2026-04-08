# Artifact Policy

This repository has historically accumulated generated assets and large files. From this point forward:

## Do not commit
- Playwright recordings and traces
- temporary deployment archives
- exported analytics dumps
- offline bundles containing keys or secrets
- ad-hoc ZIP/RAR packages of technical documents
- portable runtimes or embedded third-party binaries

## Preferred destinations
- CI artifacts for test output
- object storage for exported datasets and generated media
- GitHub Releases for distributable bundles
- internal document storage for technical document packages

## Enforcement guidance
Keep `.gitignore` aligned with this policy and treat any future large binary addition as an explicit exception, not the default path.
