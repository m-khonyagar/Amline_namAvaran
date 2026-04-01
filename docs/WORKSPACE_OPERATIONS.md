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

## Simple End-User Local Test

Use this flow when you want to validate the platform like a normal user (contract list + wizard):

1. Start backend/API target: full Docker stack, staging API, or the lightweight dev mock (`[dev-mock-api/README.md](../dev-mock-api/README.md)`) on port 8080 when `backend/backend` is not present.
2. Create `amline-ui/.env.local` from `amline-ui/.env.example`.
3. Run the user app:

```powershell
cd amline-ui
npm install
npm run dev
```

4. Open `http://localhost:3000/login` and login with OTP.
5. Continue with:
   - `http://localhost:3000/contracts`
   - `http://localhost:3000/contracts/wizard`

For QA automation against local user app, use:

```powershell
cd qa-amline-tests
$env:BASE_URL="http://localhost:3000"
npm test
```

### End-to-end (amline-ui + dev mock, recommended)

Playwright in `amline-ui` starts `dev-mock-api` on port 8080 and runs a smoke test (login bypass → wizard → landlord step). Requires Python deps in `dev-mock-api` (`pip install -r requirements.txt`) and Google Chrome installed (or set `PW_USE_BUNDLED_CHROMIUM=1` after `npx playwright install chromium`).

```powershell
cd dev-mock-api
pip install -r requirements.txt
cd ../amline-ui
npm install
npm run test:e2e
```

Admin panel E2E (MSW, port 3002): from `admin-ui`, run `npx playwright test`.

## Production API on Parmin (optional)

To deploy the Parmin stack, **prefer SSH key**: first follow [`PARMIN_CONSOLE_SSH_KEY.md`](PARMIN_CONSOLE_SSH_KEY.md) (one-line paste in Parmin Console), then run [`scripts/deploy-backend-parmin-key.ps1`](../scripts/deploy-backend-parmin-key.ps1) or [`scripts/deploy-backend-parmin-key.sh`](../scripts/deploy-backend-parmin-key.sh). Password-based: [`scripts/deploy-backend-parmin.sh`](../scripts/deploy-backend-parmin.sh) / [`deploy-backend-parmin.ps1`](../scripts/deploy-backend-parmin.ps1) with `DEPLOY_PASSWORD` (never commit). See [`DEPLOY_BACKEND_PARMIN.md`](DEPLOY_BACKEND_PARMIN.md). After containers are up, point `api.amline.ir` nginx `proxy_pass` at `http://127.0.0.1:8080` if needed.
