# Branch Protection Rules

## `develop` Branch

### Required Status Checks

The following checks must pass before merging to `develop`:

| Check | Workflow | Required |
|-------|----------|----------|
| Security Validation | `pr-check.yml` | ✅ Yes |
| Code Quality & Linting | `pr-check.yml` | ✅ Yes |
| Infrastructure Validation | `pr-check.yml` | ✅ Yes |
| Unit Tests | `pr-check.yml` | ✅ Yes |
| Lambda Function Tests | `pr-check.yml` | ✅ Yes |
| Build Validation | `pr-check.yml` | ✅ Yes |

### E2E Tests

E2E tests run **after** deployment to the dev environment, not as a PR gate:

- **Trigger**: Automatically after `Deploy to Development` workflow succeeds
- **Workflow**: `.github/workflows/e2e-tests.yml`
- **Default browser**: Chromium (Firefox and WebKit available via manual dispatch)
- **Environment**: Dev environment only (`DEV_BASE_URL` secret)

### Why E2E Tests Are Post-Deploy

E2E tests require a live deployed environment with real AWS resources (Cognito, DynamoDB). They cannot run against a PR without a deployed environment, so they run as a post-deploy validation step.

To run E2E tests manually against a specific URL:

```
GitHub Actions → E2E Tests → Run workflow → Enter base_url and browsers
```

## Required GitHub Secrets

### For `e2e-tests.yml`

| Secret | Description |
|--------|-------------|
| `DEV_BASE_URL` | URL of the deployed dev environment (e.g., `https://dev.budgetbuddy.example.com`) |
| `E2E_AWS_ACCESS_KEY_ID` | AWS access key for E2E test user (limited to Cognito + DynamoDB dev resources) |
| `E2E_AWS_SECRET_ACCESS_KEY` | AWS secret key for E2E test user |
| `DEV_COGNITO_USER_POOL_ID` | Cognito User Pool ID for the dev environment |
| `DEV_COGNITO_CLIENT_ID` | Cognito App Client ID for the dev environment |

### Security Note

The E2E AWS credentials (`E2E_AWS_*`) should be scoped to a dedicated IAM user with **minimal permissions**:
- `cognito-idp:AdminCreateUser`
- `cognito-idp:AdminSetUserPassword`
- `cognito-idp:AdminDeleteUser`
- `cognito-idp:AdminUpdateUserAttributes`
- `cognito-idp:InitiateAuth`
- `dynamodb:PutItem`, `GetItem`, `DeleteItem`, `Query` on dev tables only

## `main` Branch

`main` is the production branch. PRs to `main` from `develop` require:
- All `develop` checks passing
- Manual approval from a repository owner
- Triggered via `deploy-prod.yml` workflow (manual trigger with approval)
