# JSON File Corruption Prevention Guide

## 🚨 Critical Issue: JSON File Corruption

### Problem Summary
Multiple JSON files in the BudgetBuddy project have been corrupted by accidentally overwriting them with JavaScript/TypeScript content, causing severe runtime errors and service outages.

### Identified Corrupted Files
1. **`backend/layers/common/nodejs/package.json`** - Overwritten with `utils.js` content
2. **`backend/layers/common/nodejs/package.json`** - Later overwritten with email function package.json content

### Root Causes
1. **Copy-paste errors** during file editing
2. **Incorrect file redirections** using PowerShell commands like `Get-Date | Out-File`
3. **File path confusion** when working with similar filenames
4. **Lack of JSON validation** before deployment

### Impact Assessment
- **502 Bad Gateway errors** on all affected API endpoints
- **Lambda initialization failures** due to invalid JSON syntax
- **Complete service outage** for affected functionality
- **Development time loss** due to debugging and fixing

## 🛡️ Prevention Strategies

### 1. JSON File Validation
Always validate JSON files before committing:

```bash
# Validate a single JSON file
node -e "JSON.parse(require('fs').readFileSync('path/to/file.json', 'utf8'))"

# Validate all JSON files in project
find . -name "*.json" -not -path "./node_modules/*" -not -path "./cdk.out/*" | xargs -I {} node -e "try { JSON.parse(require('fs').readFileSync('{}', 'utf8')); console.log('✅ {}'); } catch(e) { console.log('❌ {} - ' + e.message); }"
```

### 2. Pre-commit Hooks
Add JSON validation to git pre-commit hooks:

```bash
#!/bin/sh
# .git/hooks/pre-commit
echo "Validating JSON files..."
for file in $(git diff --cached --name-only | grep '\.json$'); do
  if [ -f "$file" ]; then
    node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>/dev/null
    if [ $? -ne 0 ]; then
      echo "❌ Invalid JSON: $file"
      exit 1
    fi
  fi
done
echo "✅ All JSON files are valid"
```

### 3. File Operation Safety Rules

#### ❌ NEVER DO:
```bash
# These commands can corrupt JSON files
Get-Date | Out-File -FilePath "package.json" -Append
echo "some content" > package.json
cat utils.js > package.json
```

#### ✅ ALWAYS DO:
```bash
# Use proper JSON editing tools
# 1. Edit in IDE with JSON validation
# 2. Use jq for command-line JSON manipulation
jq '.version = "1.0.1"' package.json > temp.json && mv temp.json package.json

# 3. Validate after editing
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"
```

### 4. File Naming Conventions
Use distinct naming patterns to avoid confusion:
- **Lambda functions**: `backend/functions/{service}/package.json`
- **Lambda layers**: `backend/layers/{layer}/nodejs/package.json`
- **Infrastructure**: `infrastructure/package.json`
- **Frontend packages**: `packages/{package}/package.json`

### 5. IDE Configuration
Configure your IDE to:
- **Auto-validate JSON** on save
- **Show JSON syntax errors** immediately
- **Use JSON schema validation** where possible
- **Enable file type detection** to prevent wrong content types

### 6. Deployment Safety Checks
Add JSON validation to deployment pipeline:

```typescript
// In CDK deployment
const fs = require('fs');
const packageJsonPath = 'backend/layers/common/nodejs/package.json';

try {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  JSON.parse(content);
  console.log('✅ Layer package.json is valid');
} catch (error) {
  console.error('❌ Invalid JSON in layer package.json:', error.message);
  process.exit(1);
}
```

## 🔍 Detection Methods

### 1. Automated Scanning
Create a script to detect corrupted JSON files:

```bash
#!/bin/bash
# scan-json-files.sh
echo "Scanning for corrupted JSON files..."

find . -name "*.json" -not -path "./node_modules/*" -not -path "./cdk.out/*" | while read file; do
  # Check for JavaScript patterns in JSON files
  if grep -q "^/\*\*\|^const\|^function\|^module\.exports" "$file"; then
    echo "🚨 CORRUPTED: $file contains JavaScript code"
  fi

  # Validate JSON syntax
  if ! node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>/dev/null; then
    echo "❌ INVALID JSON: $file"
  fi
done
```

### 2. Regular Audits
Schedule regular JSON file audits:
- **Weekly**: Automated scan of all JSON files
- **Before deployment**: Mandatory JSON validation
- **After major changes**: Manual review of critical JSON files

## 📋 Recovery Procedures

### 1. Immediate Response
When JSON corruption is detected:
1. **Stop all deployments** immediately
2. **Identify the corrupted file(s)**
3. **Restore from git history** or backup
4. **Validate the restored file**
5. **Test locally** before redeploying

### 2. File Recovery Commands
```bash
# Restore from git history
git checkout HEAD~1 -- path/to/corrupted.json

# Validate the restored file
node -e "JSON.parse(require('fs').readFileSync('path/to/corrupted.json', 'utf8'))"

# Check git history for when corruption occurred
git log --oneline -p -- path/to/corrupted.json
```

## 🎯 Critical Files to Monitor

### High Priority (Service Breaking)
- `backend/layers/common/nodejs/package.json` - Lambda layer dependencies
- `infrastructure/package.json` - CDK dependencies
- `packages/*/package.json` - Frontend dependencies

### Medium Priority (Feature Breaking)
- `backend/functions/*/package.json` - Individual Lambda function dependencies
- `tsconfig.json` - TypeScript configuration
- Configuration files in `.kiro/` directory

### Low Priority (Development Impact)
- `package-lock.json` files (auto-generated)
- Test configuration files

## 🚀 Implementation Checklist

- [ ] Add JSON validation to pre-commit hooks
- [ ] Create automated JSON scanning script
- [ ] Configure IDE JSON validation
- [ ] Add deployment-time JSON validation
- [ ] Document file naming conventions
- [ ] Train team on safe file operations
- [ ] Set up regular audit schedule
- [ ] Create recovery procedures documentation

## 📞 Emergency Contacts

If JSON corruption causes production issues:
1. **Immediate**: Rollback to last known good deployment
2. **Short-term**: Restore corrupted files from git history
3. **Long-term**: Implement prevention measures from this guide

---

**Remember**: JSON corruption can cause complete service outages. Prevention is always better than recovery!
