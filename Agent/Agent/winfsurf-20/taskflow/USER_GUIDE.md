# Agent Windsurf User Guide

## What this app does

Agent Windsurf is a local-first desktop workspace for:

- creating and running workflows
- chatting with an assistant
- assigning tools such as notifications, file sharing, PowerShell, Gmail, Telegram, and Bale
- controlling the local Windows desktop through a permission-based operator layer
- learning from previous runs through a continuous self-improvement loop

## Main pages

### Dashboard

Use this page to understand system readiness, recent tasks, outputs, and trust signals.

### Tasks

Use this page to create a workflow from a goal. A task can then be planned, started, paused, resumed, cancelled, and inspected.

### Task Detail

Use this page to inspect:

- progress
- steps
- logs
- artifacts
- collaboration handoffs

If the workflow is created from Agent mode, an `agent-playbook.md` file may be attached automatically.

### Files

Use this page to preview artifacts. Markdown files render with formatted headings, lists, code blocks, and links.

### Chat

Use this page for:

- interactive assistant chat
- agent-mode requests
- file uploads
- tool assignment
- connector setup
- notification tests
- self-improvement controls

### Computer

Use this page to start a desktop operator session and run local actions such as:

- PowerShell commands
- screenshots
- IDE launch
- keyboard and mouse operations

### Settings

Use this page to set:

- workspace path
- safety mode
- preferred model label

## Remote control channels

### Telegram

After connecting a bot token and chat ID, the bot can respond to:

- `/start`
- `/status`
- `/agent <goal>`
- `/run <powershell command>`
- `/notify <message>`

### Bale

Bale mirrors the Telegram remote-control flow:

- `/start`
- `/status`
- `/agent <goal>`
- `/run <powershell command>`
- `/notify <message>`

## Notifications

Desktop notifications can be triggered from:

- the notification tool inside chat
- Telegram `/notify`
- Bale `/notify`
- the built-in notification test action

## Self-improvement

The continuous self-improvement loop reviews recent tasks and assistant usage, then extracts:

- reusable lessons
- preferred tools
- a prompt prefix
- an agent playbook for future workflows

You can control this loop from the `Chat` page:

- `Run review now`
- `Pause loop`
- `Resume loop`

## Final notes

- The desktop app is designed to run with its bundled backend automatically.
- Most advanced integrations work locally first.
- For Gmail, Telegram, and Bale, real credentials are required for live production use.
