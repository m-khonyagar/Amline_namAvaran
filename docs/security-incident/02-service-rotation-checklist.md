# Service Rotation Checklist

??? ??????? ?? ??? ?? ??? ???? ????.

| Priority | Service | Action | Status | Notes |
|---|---|---|---|---|
| P0 | Email (primary) | Password reset + 2FA + sign-out all sessions | pending | |
| P0 | OpenAI API | Revoke all leaked keys, create new project key | pending | |
| P0 | GitHub | Revoke PAT/SSH keys, rotate tokens | pending | |
| P0 | GitLab/Hamgit | Revoke PAT/SSH/GPG, issue new tokens | pending | |
| P0 | Figma | Revoke personal token, re-issue | pending | |
| P0 | Cloud/DNS panels | Reset passwords + enable MFA | pending | |
| P0 | Payment gateways | Reset credentials + transaction review | pending | |
| P0 | SMS providers | Rotate API keys and sender panel passwords | pending | |
| P1 | Banking/Tax portals | Password reset + verify recovery channels | pending | |
| P1 | CRM/Chat/Analytics | Rotate tokens and connected app grants | pending | |
| P1 | Router/Modem/VoIP | Change admin creds, IP restrict management | pending | |
| P2 | Social media accounts | Password reset + 2FA + backup codes | pending | |

## Validation after each item
- Confirm old credential no longer works.
- Confirm new credential stored only in secure vault.
- Capture timestamp and operator in tracker.
