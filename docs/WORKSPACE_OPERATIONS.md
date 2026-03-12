# Workspace Operations

This document standardizes how to bootstrap and validate the mixed Node/Python workspace.

## Bootstrap

Run the bootstrap script from the repository root:

```powershell
.\scripts\bootstrap-workspace.ps1
```

Common options:

```powershell
.\scripts\bootstrap-workspace.ps1 -Scope frontend
.\scripts\bootstrap-workspace.ps1 -Scope services -SkipNode
.\scripts\bootstrap-workspace.ps1 -Scope all -UseCiInstall
```

## Validation

Run the validation script from the repository root:

```powershell
.\scripts\validate-workspace.ps1
```

Common options:

```powershell
.\scripts\validate-workspace.ps1 -Scope frontend -IncludeBuild
.\scripts\validate-workspace.ps1 -Scope services -IncludeBackendTests
```

## Groups

- `frontend`: `admin-ui`, `amline-ui`, `site`, `seo-dashboard`
- `services`: `backend/backend`, `pdf-generator`
- `labs`: `Figma`, `TaskFlow frontend`
- `all`: every supported project in `workspace.manifest.json`

## Notes

- `npm ci` is used when a lockfile exists and CI-style installs are requested.
- `npm install` is used for projects that currently do not keep a lockfile in the repository.
- Python services use Poetry.
- Validation intentionally skips heavyweight backend tests unless `-IncludeBackendTests` is passed.
