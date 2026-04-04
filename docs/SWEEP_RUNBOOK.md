# Sweep AI — Runbook (Amline_namAvaran)

This repo is configured for **[Sweep AI](https://github.com/apps/sweep-ai)** via root **`sweep.yaml`** (and identical **`.sweep.yaml`**). Without `sweep.yaml` on the **default branch (`main`)**, Sweep falls back to generic behavior and **misses Amline SSOT rules**.

## Preconditions (owner checklist)

1. **Install the app**  
   [github.com/apps/sweep-ai](https://github.com/apps/sweep-ai) → Install → grant access to **`m-khonyagar/Amline_namAvaran`**.

2. **Merge `sweep.yaml` to `main`**  
   Until merged, Sweep cannot read project rules from this file.

3. **Issues enabled**  
   Repository Settings → General → Issues ✓ (already `true`).

4. **Billing / quota**  
   Sweep needs an active plan or free tier quota; otherwise no PR will appear.

## How work is triggered

| Mechanism | When Sweep picks it up |
|-----------|-------------------------|
| Title starts with **`Sweep:`** | Yes (per Sweep docs) |
| Label **`sweep`** | Yes (repo convention + mirrored in `sweep.yaml` rules) |

Issues **#9–#19** follow this pattern (SSOT v2.0 backlog).

## What Sweep is instructed to do (summary)

- Read the **full issue** (Objective, Scope, SSOT Alignment, Acceptance Criteria, Notes).
- Open **merge-ready PRs** to `main`, add/update **tests**, keep **CI green**.
- Follow **SSOT v2.0**, epic **#19** ordering hints, and Amline architecture docs linked from `sweep.yaml`.

## Verify it works (smoke test)

1. After merge to `main`, open a small issue:  
   **`Sweep: chore — add a one-line comment in docs/SWEEP_RUNBOOK.md pointing to this runbook section`**  
   (or any trivial doc-only task).
2. Add label **`sweep`**.
3. Wait several minutes; check for a **Sweep PR** or a comment from the bot on the issue.
4. If nothing happens: re-check app installation, branch default, and Sweep dashboard/email.

## GitHub Actions workflow `.github/workflows/sweep.yaml`

This workflow **does not run Sweep**; it only **validates YAML** when issues/PRs change so broken config is not merged.

## Support

- [Sweep docs](https://docs.sweep.dev/)  
- [Sweep Discourse](https://community.sweep.dev/)
