# 7-Day Hardening Plan

## Day 1
- Complete P0 runbook
- Freeze production config changes except security work

## Day 2
- Move all secrets to vault (1Password/Bitwarden/Cloud secret manager)
- Remove secrets from local notes/files/repo history where possible

## Day 3
- Enforce MFA org-wide on critical services
- Set account recovery safeguards (backup emails/phones)

## Day 4
- Audit CI/CD secrets and rotate all deployment credentials
- Review server SSH access list and rotate keys

## Day 5
- Enable monitoring/alerts: login anomalies, API key misuse, payment alerts
- Add IP restrictions for admin panels

## Day 6
- Security smoke tests for all critical business flows
- Verify contract workflow availability with backend team

## Day 7
- Post-incident retrospective
- Final report: timeline, impact, fixes, remaining risks

## Done criteria
- No leaked secret remains valid
- All critical accounts protected with MFA
- Secret lifecycle policy documented (owner, rotation period, emergency revoke)
