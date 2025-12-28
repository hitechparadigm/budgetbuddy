# Delete Corrupted Budgets

## Problem
If you're seeing a blank screen or `budget.groups.find is not a function` error, it means you have corrupted budget data in DynamoDB with the wrong format.

## Solution

### Step 1: Clear Browser Data
Open browser console (F12) and run:
```javascript
localStorage.clear();
location.reload();
```

### Step 2: Delete Budgets from DynamoDB

#### Option A: PowerShell Script (Recommended for Windows)
```powershell
.\scripts\delete-corrupted-budgets.ps1
```

With custom family ID:
```powershell
.\scripts\delete-corrupted-budgets.ps1 -FamilyId "family_your_user_id"
```

#### Option B: Node.js Script
```bash
node scripts/delete-corrupted-budgets.js
```

With custom family ID:
```bash
node scripts/delete-corrupted-budgets.js family_your_user_id
```

#### Option C: AWS CLI Directly
```bash
# Query budgets
aws dynamodb query \
  --table-name budgetbuddy-dev-main \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"FAMILY#family_mock_user_id"}}' \
  --region us-east-1

# Delete a specific budget
aws dynamodb delete-item \
  --table-name budgetbuddy-dev-main \
  --key '{"PK":{"S":"FAMILY#family_mock_user_id"},"SK":{"S":"BUDGET#2025-11"}}' \
  --region us-east-1
```

### Step 3: Create Fresh Budget
1. Go to the app
2. Complete onboarding
3. Create a new AI budget
4. It should work correctly now!

## What These Scripts Do
- Query DynamoDB for all budgets for your family
- Delete each budget item
- Leave other data (user profile, etc.) intact

## Prerequisites
- AWS CLI installed and configured
- Proper AWS credentials with DynamoDB access
- Node.js (for the Node.js script option)

## Safety
- Scripts only delete budget items (entityType = 'BUDGET')
- User profile and other data are not affected
- You can always recreate budgets through the app
