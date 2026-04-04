# Sweep AI — Runbook (Amline_namAvaran)

This repo is configured for **Sweep** (open-source bot + rules) via root **`sweep.yaml`** (and identical **`.sweep.yaml`**). Without `sweep.yaml` on the **default branch (`main`)**, a self-hosted Sweep instance falls back to generic behavior and **misses Amline SSOT rules**.

## Why `github.com/apps/sweep-ai` shows 404

The **public hosted GitHub App** URL that older docs referenced is **no longer available** (GitHub returns 404). The Sweep team’s current public product is the **[JetBrains plugin “Sweep AI”](https://plugins.jetbrains.com/plugin/26860-sweep-ai)** on the Marketplace — that is **not** the same as the GitHub issue-driven bot.

To get **GitHub Issue → PR** automation today, use **self-hosted Sweep** from [`sweepai/sweep`](https://github.com/sweepai/sweep) (Docker + your own GitHub App).

## Preconditions (owner checklist)

1. **Run Sweep against this repo (self-hosted)**  
   - Create a GitHub App and license via **[deploy.sweep.dev](https://deploy.sweep.dev/)** (per upstream [deployment guide](https://github.com/sweepai/sweep/blob/main/docs/pages/deployment.mdx)).  
   - Host the webhook (e.g. `docker compose up` for the `hosted` service), point the app’s **Webhook URL** at your server, and install the app on **`m-khonyagar/Amline_namAvaran`**.  
   - Add **OpenAI** and **Anthropic** API keys to `.env` as documented upstream.

2. **Merge `sweep.yaml` to `main`**  
   Until merged, Sweep cannot read project rules from this file.

3. **Issues enabled**  
   Repository Settings → General → Issues ✓ (already `true`).

4. **License / API quota**  
   Self-hosted Sweep uses a **license key** from the deploy flow (trial then enterprise contact `team@sweep.dev` per upstream docs). LLM usage depends on your API keys and provider billing.

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

<!-- Sweep smoke-test anchor (e.g. issue #22): a healthy self-hosted app opens a PR that edits this runbook; if the stack is down, check `C:\sweep\.env` has real keys (no `REPLACE_ME_*`) and `docker ps` shows container `webhook`. -->

1. After merge to `main`, open a small issue:  
   **`Sweep: chore — add a one-line comment in docs/SWEEP_RUNBOOK.md pointing to this runbook section`**  
   (or any trivial doc-only task).
2. Add label **`sweep`**.
3. Wait several minutes; check for a **Sweep PR** or a comment from the bot on the issue.
4. If nothing happens: re-check app installation, branch default, and Sweep dashboard/email.

## GitHub Actions workflow `.github/workflows/sweep.yaml`

This workflow **does not run Sweep**; it only **validates YAML** when issues/PRs change so broken config is not merged.

## Support

- Upstream repo: [sweepai/sweep](https://github.com/sweepai/sweep)  
- Community: [Sweep Discourse](https://community.sweep.dev/)  
- Many `docs.sweep.dev` pages may 404 after the product pivot; prefer the repo’s `docs/` and `deploy.sweep.dev` for self-hosting.
