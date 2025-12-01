# AI Budget Bug Fix - Testing Guide

## Bug Fixed
**Issue**: Clicking "Use This Budget" after AI onboarding redirected back to onboarding questions instead of showing the generated budget.

**Fix**: Modified budget loading logic to check for AI-generated budget in localStorage before showing empty state.

---

## 🧪 Local Testing

### Prerequisites
```powershell
# Navigate to web app directory
cd packages/web-app

# Ensure dependencies are installed
npm install
```

### Start Local Development Server
```powershell
# Start the dev server
npm run dev
```

The app will be available at: `http://localhost:5173/`

### Testing Steps

1. **Clear Previous Data** (Important!)
   - Open browser DevTools (F12)
   - Go to Console tab
   - Run: `localStorage.clear()`
   - Refresh the page

2. **Register/Login**
   - Go to `http://localhost:5173/`
   - Login with existing account OR register new account
   - Email: `test@example.com`
   - Password: `Test123!`

3. **Complete AI Onboarding**
   - You should be redirected to `/onboarding` automatically
   - Answer all 7 questions:
     - Family situation (e.g., "Couple")
     - Household size (e.g., "2")
     - Monthly income (e.g., "$3,000 - $5,000")
     - Housing status (e.g., "Rent")
     - Transportation (select one or more)
     - Main financial goal (e.g., "Build emergency fund")
     - Debt situation (e.g., "No debt")
   - Click "Generate My Budget 🤖"

4. **Wait for AI Generation**
   - Loading screen shows for ~3 seconds
   - AI-generated budget appears with:
     - Income categories
     - Savings categories
     - Expense categories
     - AI insights

5. **Click "Use This Budget"** ✅ **THIS IS THE KEY TEST**
   - **Expected Result**: Budget page loads with your AI-generated budget
   - **Bug Behavior (before fix)**: Would redirect back to onboarding questions
   - **Success Criteria**:
     - You see the budget page at `/budget`
     - All categories from AI generation are visible
     - Income, Savings, and Expenses groups are populated
     - No redirect to onboarding

6. **Verify Budget Persistence**
   - Refresh the page (F5)
   - Budget should still be there
   - Navigate away and back to `/budget`
   - Budget should persist

### Debugging (if issues occur)

**Check Browser Console**:
```javascript
// Check if AI budget is in localStorage
console.log('AI Budget:', localStorage.getItem('ai-generated-budget'));

// Check current month
console.log('Current Month:', new Date().toISOString().slice(0, 7));

// Check auth token
console.log('Auth Token:', localStorage.getItem('budgetbuddy_id_token'));
```

**Common Issues**:
- **Redirects to onboarding**: Clear localStorage and try again
- **Empty budget page**: Check console for errors
- **API errors**: Verify backend is running and accessible

---

## ☁️ AWS Testing

### Deploy to AWS

```powershell
# Navigate to project root
cd C:\Users\dimam\Documents\Projects\budgetbuddy

# Deploy web app to S3 and CloudFront
.\scripts\deploy-web-app.ps1
```

**Expected Output**:
```
Building React app...
✓ Built in XXXms
Uploading to S3...
✓ Uploaded XX files
Invalidating CloudFront cache...
✓ Invalidation created: IXXXXXXXXXXXXX
✅ Deployment complete!
Live at: https://d1ueeugn9zcx7n.cloudfront.net
```

### Wait for Cache Invalidation
- CloudFront cache invalidation takes **5-10 minutes**
- Wait before testing to ensure latest code is served
- Check invalidation status in AWS Console if needed

### Testing on CloudFront

1. **Open CloudFront URL**
   - URL: `https://d1ueeugn9zcx7n.cloudfront.net`
   - Open in incognito/private window (to avoid cache)

2. **Clear Browser Data** (Important!)
   - Press `Ctrl+Shift+Delete`
   - Clear "Cookies and site data"
   - Clear "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"

3. **Follow Same Testing Steps as Local**
   - Register/Login
   - Complete AI onboarding (7 questions)
   - Click "Generate My Budget"
   - **Click "Use This Budget"** ✅
   - Verify budget loads correctly

4. **Test Across Browsers**
   - Chrome
   - Firefox
   - Edge
   - Safari (if available)

### Verify API Integration

**Check Network Tab**:
1. Open DevTools (F12)
2. Go to Network tab
3. Click "Use This Budget"
4. Look for:
   - `POST /budget` request
   - Status: 200 OK
   - Response contains budget data

**Check Console Logs**:
```
[loadBudget] Found AI-generated budget waiting to be used for current month
[saveBudgetToBackend] Saving budget for month: 2025-11
[saveBudgetToBackend] Budget saved successfully
[loadBudget] AI-generated budget used and cleared from localStorage
```

---

## ✅ Success Criteria

### The fix is working if:
- ✅ Clicking "Use This Budget" loads the budget page (not onboarding)
- ✅ All AI-generated categories appear in the budget
- ✅ Budget persists after page refresh
- ✅ No console errors
- ✅ Budget saves to backend (check Network tab)
- ✅ Works on both local and AWS

### The bug still exists if:
- ❌ Redirects back to onboarding after clicking "Use This Budget"
- ❌ Budget page is empty
- ❌ Console shows errors about missing budget
- ❌ Budget doesn't persist after refresh

---

## 🐛 Troubleshooting

### Issue: Still redirects to onboarding
**Solution**:
1. Clear localStorage completely
2. Clear browser cache
3. Hard refresh (Ctrl+F5)
4. Try in incognito window

### Issue: Budget page is empty
**Check**:
1. Console for errors
2. Network tab for failed API calls
3. localStorage for `ai-generated-budget` key
4. Auth token is valid

### Issue: "No budget found" message
**This is expected if**:
- You're viewing a past/future month
- You haven't completed onboarding yet
- AI budget was already used and cleared

**Solution**: Complete onboarding again to generate new budget

### Issue: AWS deployment not updating
**Solution**:
1. Wait 10 minutes for CloudFront cache invalidation
2. Check S3 bucket has latest files
3. Create manual CloudFront invalidation for `/*`
4. Clear browser cache completely

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

LOCAL TESTING:
[ ] Onboarding completes successfully
[ ] AI budget generates correctly
[ ] "Use This Budget" loads budget page
[ ] Budget persists after refresh
[ ] No console errors

AWS TESTING:
[ ] Deployment successful
[ ] Cache invalidation complete
[ ] Onboarding works on CloudFront
[ ] "Use This Budget" works on CloudFront
[ ] Budget persists on CloudFront
[ ] Works in multiple browsers

NOTES:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Quick Test Commands

```powershell
# Local testing
cd packages/web-app && npm run dev

# AWS deployment
.\scripts\deploy-web-app.ps1

# Check CloudFront invalidation status
aws cloudfront get-invalidation --distribution-id E1L1SU9OV8L4YR --id <INVALIDATION_ID>
```

---

**Happy Testing!** 🎉
