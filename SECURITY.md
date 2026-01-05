# Security Guidelines

## Security Guidelines

This document outlines security practices and guidelines for the BudgetBuddy application to prevent exposure of sensitive information.

## Automated Security Checks

### Pre-deployment Security Validation

Every deployment automatically runs comprehensive security checks:

- **JWT Token Detection**: Scans for real authentication tokens
- **Credential Scanning**: Checks for AWS keys and hardcoded passwords
- **Log File Validation**: Ensures no sensitive logs are committed
- **Environment Variable Usage**: Validates proper secret management
- **Dependency Audit**: Runs npm audit for known vulnerabilities

### Pull Request Security Validation

All pull requests are automatically scanned for:

- Exposed secrets and credentials
- Hardcoded passwords
- Sensitive log files
- Proper .gitignore configuration
- Mock token safety

### Manual Security Checks

Run security validation manually:

```bash
# Full security scan
npm run security:check

# Pre-commit security check
npm run security:pre-commit

# Complete pre-deployment validation
npm run pre-deploy
```

## Secret Management

### Environment Variables

- **NEVER** commit passwords, API keys, or tokens to the repository
- Use environment variables for all sensitive configuration
- Example: `TEST_USER_PASSWORD` environment variable instead of hardcoded passwords

### Development Testing

- Use mock tokens clearly marked as development-only
- Mock tokens should contain obviously fake data (e.g., "MOCK_USER_ID", "test@example.com")
- Include clear warnings in mock authentication files

### Log Files

- **NEVER** commit log files containing real authentication tokens
- Add log files to `.gitignore` to prevent accidental commits
- Use sanitized logs for debugging (remove sensitive headers)

## Files to Exclude from Git

The following files are automatically excluded via `.gitignore`:

- `auth-logs.txt` - Contains real JWT tokens
- `*.log` - All log files
- `logs/` - Log directories
- `debug-*.txt` - Debug output files

## JWT Token Handling

### Production Tokens

- Production JWT tokens contain real user data and must never be committed
- Tokens should be handled only in memory or secure storage
- Rotate tokens immediately if exposed

### Mock Tokens

- Use obviously fake payloads for development
- Include clear "MOCK" or "TEST" identifiers
- Document that tokens are for development only

## Incident Response

If secrets are accidentally committed:

1. **Immediate Actions**:

   - Remove the file containing secrets
   - Add the file to `.gitignore`
   - Commit the removal immediately

2. **Token Rotation**:

   - Rotate any exposed JWT tokens
   - Update Cognito user pool if necessary
   - Invalidate compromised sessions

3. **Verification**:
   - Search repository for other instances of exposed secrets
   - Update all affected systems
   - Monitor for unauthorized access

## Best Practices

1. **Code Review**: Always review commits for sensitive information
2. **Environment Variables**: Use `.env` files (excluded from git) for local development
3. **Mock Data**: Use obviously fake data in tests and development
4. **Logging**: Sanitize logs before committing any debug information
5. **Documentation**: Keep security practices documented and up-to-date

## Contact

For security concerns or incidents, contact the development team immediately.
