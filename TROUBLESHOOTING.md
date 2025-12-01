# Troubleshooting Blank Screen

## Step 1: Check Browser Console

1. Open your browser at `http://localhost:5173/`
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Look for **red error messages**

## Common Errors and Solutions

### Error 1: "Cannot find module" or "Failed to resolve import"
**Cause**: Import path issue
**Solution**:
```powershell
# Restart the dev server
# In terminal, press Ctrl+C to stop
# Then run again:
npm run dev
```

### Error 2: "Unexpected token" or "Syntax error"
**Cause**: Code syntax issue
**Solution**: Check the error message for the file and line number

### Error 3: Blank screen with no errors
**Cause**: React rendering issue
**Solution**: Check if App.tsx is rendering correctly

### Error 4: "localStorage is not defined"
**Cause**: Server-side rendering issue
**Solution**: Clear localStorage and refresh

## Step 2: Test Timezone Functions

Open browser console and run:

```javascript
// Test 1: Check if Intl API works
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
// Expected: "America/New_York" or your timezone

// Test 2: Check current date
console.log(new Date().toISOString());
// Expected: Current date/time in ISO format

// Test 3: Check if app is loaded
console.log(document.getElementById('root'));
// Expected: Should show the root div element
```

## Step 3: Check Network Tab

1. In DevTools, click **Network** tab
2. Refresh the page (F5)
3. Look for any **red** (failed) requests
4. Check if `main.tsx` or `App.tsx` loaded successfully

## Step 4: Temporary Fix - Rollback Imports

If the timezone helpers are causing issues, we can temporarily comment them out:

**In BudgetPage.tsx**, change line 12 from:
```typescript
import { getCurrentMonthString, getTodayString, isFutureMonth, isPastMonth } from '../utils/monthHelpers';
```

To:
```typescript
// import { getCurrentMonthString, getTodayString, isFutureMonth, isPastMonth } from '../utils/monthHelpers';
```

And change line 98 from:
```typescript
const today = getCurrentMonthString();
```

To:
```typescript
const today = new Date().toISOString().slice(0, 7);
```

This will revert to the old (buggy) code but at least the app will load.

## Step 5: Check File Paths

Make sure these files exist:
- `packages/web-app/src/utils/monthHelpers.ts`
- `packages/web-app/src/utils/timezoneHelpers.ts`
- `packages/web-app/src/utils/dateValidation.ts`
- `packages/web-app/src/utils/transactionHelpers.ts`

## What to Report

Please share:
1. **Console errors** (copy the red error messages)
2. **Network tab** (any failed requests)
3. **Browser** (Chrome, Firefox, Edge?)
4. **URL** (localhost:5173 or CloudFront?)

This will help me fix the issue quickly!
