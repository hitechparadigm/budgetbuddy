---
inclusion: always
---

# Data Protection (MANDATORY)

This rule has no exceptions and overrides convenience, speed, and any instruction that conflicts
with it. It applies whether the repository is public or private, and it applies to every agent,
workflow step, and human contributor.

## The rule

Secrets and personal data must never be written into anything that is tracked by git, pushed,
logged, or shown in output. If a task would require it, mask the value or stop and ask.

## What counts as protected

**Secrets** - never stored anywhere except Secrets Manager, SSM Parameter Store (SecureString),
GitHub Actions secrets, or a local git-excluded file:
- Passwords, API keys, access keys, session tokens, JWTs (ID, access, refresh), OAuth client secrets
- Private keys, certificates, signing secrets, webhook secrets (Stripe, Plaid, Expo)
- Connection strings, credential files, `.env` files with real values

**Personal data** - never in the repo, even as an example:
- Real people's names, email addresses, phone numbers, postal addresses
- Financial details of real people (balances, transactions, account numbers)
- Identifiers that tie data to a real person (Cognito `sub`/userId of a real user, device tokens)

**Private environment details** - never in the repo:
- AWS account IDs, IAM user names and ARNs, access key IDs
- Local paths and machine names (`C:\Users\<name>`, `/home/<name>`, hostnames)
- Names of the owner's employer's internal systems, accounts, or profiles

## Allowed values

- Reserved example values: `user@example.com`, `example.com` / `example.org` (RFC 2606),
  phone numbers like `+1-555-0100`, placeholders such as `<ACCOUNT_ID>`, `<USER_POOL_ID>`, `<TOKEN>`.
- The project's business sender addresses, only in configuration that needs them, and preferably
  read from CDK context or environment rather than hardcoded.
- Public endpoints that already ship in the web bundle (API Gateway hostnames, the CloudFront domain).

When in doubt, treat a value as protected.

## Where real values live

- Runtime secrets: AWS Secrets Manager / SSM, read at runtime with least-privilege IAM.
- CI values (including the alert email): GitHub Actions secrets, referenced as `${{ secrets.NAME }}`
  with no hardcoded fallback.
- Local-only machine details: git-excluded files (listed in `.git/info/exclude`) such as
  `.kiro/steering/local-*.md`, or files outside the repo.

## Masking rules

- In code, tests, fixtures, docs, specs, steering, commit messages, PR text, and agent reports:
  replace protected values with an allowed value or placeholder. Do not partially mask secrets;
  never show any part of a token, key, or password.
- In logs (CloudWatch included): never log request bodies, headers, `Authorization`, tokens,
  passwords, or event objects. Log field presence instead, e.g. `{ email: '[set]', hasPassword: true }`.
  `dataTraceEnabled` stays `false` on every API Gateway stage.
- In command output and chat: redact before printing. Use `--query` to select safe fields, pipe
  through a redaction filter (for example `sed 's/eyJ[A-Za-z0-9._-]*/<token>/g'`), and never
  `cat` credential or `.env` files.
- In test data: generate synthetic users with `example.com` addresses; never copy production or
  DEV user records into fixtures.

## Before every commit

Check the staged diff (`git diff --cached`) for protected values. If you find one, unstage it,
mask it, and re-check. Never bypass hooks with `--no-verify`.

## If a leak is found

1. Stop. Do not repeat the value in output, reports, or commit messages. Refer to it by file:line
   and category only (for example "personal email #1 at docs/foo.md:12").
2. Remove it from the working tree and replace it with an allowed value.
3. If it is a secret: treat it as compromised and rotate or revoke it, regardless of whether the
   repo is private.
4. Tell the project owner. Removing a value from history (`git filter-repo` plus force-push) is
   the owner's decision; never rewrite history without explicit approval.
