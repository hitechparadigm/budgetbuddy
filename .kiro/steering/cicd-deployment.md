---
inclusion: conditional
fileMatchPattern: "{.github/workflows/**,scripts/deploy*,scripts/*cicd*}"
---

# CI/CD Rules

## Critical: No Parallel Deployments

- Only ONE deployment at a time (CloudFormation conflicts cause failures)
- **Before EVERY push**: run `node scripts/check-cicd-status.js`
  - If `IN_PROGRESS` or `QUEUED`: **STOP. Wait 2 minutes. Check again.**
  - If `FAILED`: fix the failure FIRST, then push
  - If `SUCCESS`: proceed with push
- **NEVER push while status is "in_progress" or "queued"**
- After push: wait for completion, check every 2min

## Deployment Flow

1. Check CI/CD status — must be SUCCESS before proceeding
2. Complete implementation + tests
3. `node scripts/safe-commit-push.js "type: description"`
   - This script validates internally — do NOT run separate validation
4. Wait for GitHub Actions to complete
5. Verify: `node scripts/check-cicd-status.js`

## If Failed

1. Read `.kiro/cicd-status/latest.json` for error details
2. Fix the issue
3. Commit fix, push (after confirming no other deployment in progress)
4. Max 2 retry attempts — if still failing, document in DEVELOPMENT_LOG.md

## Environments

- dev: auto-deploy from `develop` branch on every push
- staging: auto-deploy from `main` branch
- prod: manual approval via `deploy-prod.yml` workflow dispatch

## Deployment Summary in GitHub Actions

The `deploy-dev.yml` workflow automatically generates a deployment summary in
GitHub Actions that includes:

- What was deployed (commit message / PR title)
- Which stacks were updated
- API URL and CloudFront URL
- Health check results

To make the summary more descriptive, use conventional commit messages:

- `fix: description` — bug fixes
- `feat: description` — new features
- `docs: description` — documentation only
- `chore: description` — maintenance tasks
- `refactor: description` — code refactoring

The commit message becomes the deployment title in GitHub Actions.
