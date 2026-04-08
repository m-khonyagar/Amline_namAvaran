# Sweep AI — Runbook (Amline_namAvaran)

This repository ships root **`sweep.yaml`** (and identical **`.sweep.yaml`**) so **humans, CI, and coding agents** share the same SSOT-backed instructions for issues labeled **`sweep`** and titles starting with **`Sweep:`**.

## Important: legacy “Sweep GitHub App”

GitHub lists the historical integration as **[Sweep AI [Deprecated]](https://github.com/apps/sweep-ai-deprecated)**. Do **not** rely on the old “open an issue → hosted Sweep opens a PR automatically” flow.

Sweep’s current public engineering focus is the **JetBrains plugin** ([`sweepai/sweep`](https://github.com/sweepai/sweep)). For GitHub-native automation, this repo already uses **GitHub Copilot coding agent** (see PRs from the `Copilot` app).

## What works today (recommended)

| Approach | What you do |
|---------|-------------|
| **GitHub Copilot (coding agent)** | On a `Sweep:` / `sweep` issue, start **[Copilot coding agent](https://github.com/apps/copilot-swe-agent)** from the GitHub UI so it implements the task as a PR. |
| **Cursor / local agent** | Clone the repo, open in Cursor; use `sweep.yaml` + issue body as the instruction pack. |
| **JetBrains + Sweep plugin** | Install from JetBrains Marketplace and work in the IDE against a local checkout. |

## Owner checklist

1. **`sweep.yaml` and `.sweep.yaml` on `default branch`** — CI validates parity and required keys.
2. **Issues enabled** — Settings → General → Issues ✓
3. **Optional `SWEEP_API_KEY` repository secret** — only for a custom orchestrator; otherwise ignore.

## How work is selected (repo convention)

| Mechanism | Use |
|-----------|-----|
| Title starts with **`Sweep:`** | Yes |
| Label **`sweep`** | Yes |

Issues **#9–#19** follow this SSOT v2.0 backlog pattern.

## Instructions encoded in `sweep.yaml` (summary)

- Read the **full issue** (Objective, Scope, SSOT Alignment, Acceptance Criteria, Notes).
- Open **merge-ready PRs** to `main`, add/update **tests**, keep **CI green**.
- Follow **SSOT v2.0**, epic **#19** ordering hints, and Amline docs linked from `sweep.yaml` → `docs`.

## Smoke test

1. Open a small issue titled **`Sweep: chore — one-line note in docs/SWEEP_RUNBOOK.md`** and add label **`sweep`**.
2. Start **Copilot coding agent** (or implement locally in Cursor).
3. Expect a PR or visible progress subject to Copilot/plan limits.

The workflow **Sweep issue helper** may post a **single** comment (marker `amline-sweep-helper-v1`) the first time an issue matches.

## GitHub Actions `.github/workflows/sweep.yaml`

Validates YAML, asserts `sweep.yaml` === `.sweep.yaml`, checks required keys. It does **not** execute hosted Sweep.

## GitHub Actions `.github/workflows/sweep-issue-helper.yml`

Posts a one-time automation hint on matching issues.

## References

- Deprecated app: https://github.com/apps/sweep-ai-deprecated  
- JetBrains Sweep source: https://github.com/sweepai/sweep  
- Copilot coding agent: https://github.com/apps/copilot-swe-agent  
