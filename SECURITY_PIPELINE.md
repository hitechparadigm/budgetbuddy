# Security Pipeline Documentation

This document outlines the comprehensive security measures integrated into our CI/CD pipeline.

## Security Checkpoints

### 1. Pre-Commit Security Checks

**Trigger:** Every commit attempt
**Script:** `scripts/pre-commit-security.sh`
**Command:** `npm run security:pre-commit`

**Checks Performed:**

- ✅ Staged files scanned for secrets and credentials
- ✅ JWT tokens validated (mock tokens must be clearly marked)
- ✅ AWS credentials detection
- ✅ Private key detection
- ✅ Hardcoded password detection
- ✅ Database connection string validation
- ✅ Sensitive file detection (logs, backups)
- ✅ Environment variable usage validation
- ✅ Dependency vulnerability scan (high/critical)
- ✅ Development tool safety checks

**Bypass:** `git commit --no-verify` (NOT RECOMMENDED)

### 2. Pull Request Security Validation

**Trigger:** Pull requests to main/develop branches
**Workflow:** `.github/workflows/pr-check.yml`

**Security Jobs:**

- **Security Scan:** Comprehensive secret detection and configuration validation
- **Security Property Tests:** Property-based testing of security measures
- **Mock Authentication Safety:** Validation of mock auth isolation
- **Dependency Audit:** npm audit for vulnerabilities
- **Infrastructure Security:** CDK security validation

### 3. Deployment Security Pipeline

**Trigger:** Push to main branch or manual deployment
**Workflow:** `.github/workflows/deployment-security.yml`

**Security Phases:**

#### Pre-Deployment Security

- Comprehensive security scan
- Dependency vulnerability assessment
- Production configuration validation
- Security property tests (high iteration count)
- Security compliance report generation

#### Infrastructure Security

- CDK security configuration validation
- CloudFormation template security analysis
- HTTPS enforcement verification
- AWS credential detection

#### Deployment Approval

- Manual security approval for production
- Security checkpoint logging
- Approval artifact generation

#### Post-Deployment Security

- Endpoint security validation
- SSL/TLS configuration check
- Security monitoring verification

## Security Scripts

### `scripts/security-check.sh`

Comprehensive security validation script that checks for:

- Exposed secrets and credentials
- Sensitive files
- Environment variable usage
- Mock token safety
- .gitignore security entries
- Production configuration
- Dependency vulnerabilities
- Database connection strings

### `scripts/pre-commit-security.sh`

Pre-commit focused security checks that validate:

- Staged files only
- Immediate security threats
- Development tool safety
- Quick dependency audit
- Configuration file validation

## Security Property Tests

**Location:** `tests/security/`
**Command:** `npm run security:tests`

**Property-Based Tests:**

1. **Dependency Vulnerability Detection** - Validates vulnerability scanning
2. **Automatic Vulnerability Fixing** - Tests automated fix application
3. **Production Mock Auth Exclusion** - Ensures mock auth isolation
4. **Mock Auth Production Blocking** - Validates production blocking
5. **Development Tool Production Isolation** - Tests dev tool exclusion
6. **Security Scan Automation** - Validates CI/CD integration
7. **Secret Detection Comprehensive Coverage** - Tests secret scanning
8. **Credential Replacement Safety** - Validates credential handling
9. **Security Event Logging** - Tests security monitoring
10. **Pre-commit Security Validation** - Validates pre-commit checks

## Security Configuration

### Environment Variables Required

```bash
# For testing
TEST_PASSWORD=your-test-password-here
TEST_USER_EMAIL=test@example.com

# For AWS (use AWS profiles instead of hardcoding)
AWS_PROFILE=hitechparadigm
```

### .gitignore Security Entries

```
# Security - Sensitive files
auth-logs.txt
*.log
logs/
debug-*.txt
*.bak
*.backup
*~
.env.local
.env.production
```

### Development Tool Safety

- DevHelper component has production exclusion logic
- Mock authentication blocked in production environments
- Security warnings displayed in development
- Environment-based configuration validation

## Security Monitoring

### Automated Alerts

- Dependency vulnerabilities (npm audit)
- Secret detection failures
- Production security violations
- Infrastructure security issues

### Manual Reviews

- Security property test results
- Deployment security reports
- Post-deployment validation
- Security compliance audits

## Security Best Practices

### For Developers

1. **Never commit real credentials** - Use environment variables
2. **Mark mock data clearly** - Include MOCK/TEST/DEVELOPMENT in tokens
3. **Use pre-commit hooks** - Don't bypass security checks
4. **Review security warnings** - Address all security issues
5. **Test security locally** - Run `npm run security:check` before pushing

### For DevOps

1. **Monitor security pipelines** - Ensure all checks are running
2. **Review security reports** - Check deployment security artifacts
3. **Update security tools** - Keep vulnerability databases current
4. **Audit security logs** - Regular review of security events
5. **Maintain security documentation** - Keep this guide updated

## Troubleshooting

### Common Issues

**Pre-commit blocked by security check:**

```bash
# Review the specific issue reported
# Fix the security issue
# Commit again
git add .
git commit -m "fix: address security issue"
```

**Mock token not properly marked:**

```javascript
// Bad
const mockToken = "FAKE_JWT_TOKEN_FOR_TESTING_ONLY...";

// Good
const mockToken =
  "FAKE_JWT_TOKEN_FOR_TESTING_ONLY.MOCK_TOKEN_FOR_DEVELOPMENT...";
```

**Environment variable not used:**

```javascript
// Bad
const password = "FAKE_PASSWORD_FOR_TESTING_123";

// Good
const password = process.env.TEST_PASSWORD || "your-password-here";
```

### Emergency Bypass

In extreme cases where security checks must be bypassed:

```bash
# Pre-commit bypass (NOT RECOMMENDED)
git commit --no-verify

# CI bypass (requires admin approval)
# Add [skip-security] to commit message
git commit -m "emergency fix [skip-security]"
```

## Security Contacts

- **Security Issues:** Create GitHub issue with `security` label
- **Emergency Security:** Contact repository administrators
- **Security Questions:** Review SECURITY.md file

## Compliance

This security pipeline ensures compliance with:

- Industry security best practices
- Automated vulnerability management
- Credential protection standards
- Development tool isolation
- Infrastructure security validation

Last Updated: $(date)
