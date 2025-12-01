# Testing Guide - Timezone Fix & UX Improvements

## 🧪 Local Testing

### 1. Start the Development Server

```powershell
# Navigate to web app directory
cd packages/web-app

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

The app will be available at: `http://localhost:5173/`

### 2. Test Timezone Fix

**Scenario 1: Current Month Display**
1. Open the app at `http://localhost:5173/`
2. Log in with your credentials
3. **Expected**: You should see the correct current month (November 2025 if testing on Nov 30)
4. **Before the fix**: Would show December on Nov 30 at 7:22 PM EST
5. **After the fix**: Shows November correctly

**Scenario 2: "Today" Button**
1. Navigate to a different month using arrow buttons
2. Click the "Today" button
3. **Expected**: Should navigate back to the current month (November)

**Scenario 3: Check Console Logs**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `"Initial currentMonth state (timezone-aware): 2025-11"`
4. **Expected**: Should show correct month in YYYY-MM format

### 3. Test Transaction Date Validation

**Scenario 1: Add Transaction with Future Date**
1. Click the FAB (Floating Action Button) at bottom right
2. Select "Expense"
3. Fill in the form
4. Change the date to December 1, 2025
5. **Expected**: Yellow warning banner appears
6. **Expected**: Three buttons: "Continue with November 2025", "Switch to December 2025", "Cancel"

**Scenario 2: Add Transaction with Past Date**
1. Click FAB → Expense
2. Change date to October 31, 2025
3. **Expected**: Warning banner appears for past month

### 4. Test Transaction Editing

**Scenario 1: Edit Existing Transaction**
1. Look at the transactions list in the right sidebar
2. **Double-click** on any transaction
3. **Expected**: Transaction form opens with pre-filled data
4. **Expected**: Modal title says "Edit Transaction"
5. Change the amount or description
6. Click "Update Transaction"
7. **Expected**: Transaction updates, category spent amount updates

**Scenario 2: Visual Feedback**
1. Hover over transactions in the list
2. **Expected**: Cursor changes to pointer
3. **Expected**: Background color changes slightly

### 5. Test Clear Labels

**Scenario 1: Transaction Modal**
1. Click FAB → Income
2. **Expected**: Modal title says "Record Actual Income"
3. **Expected**: Submit button says "Record Transaction"

**Scenario 2: Budget Item Modal**
1. Click "+ Add Item" under any budget group
2. **Expected**: Modal title says "Add Planned [Type] Item"
3. **Expected**: Submit button says "Add [Type] Item"

### 6. Test Settings Page

**Scenario 1: View Timezone**
1. Click "Settings" in the left sidebar
2. **Expected**: Settings page opens
3. **Expected**: Current timezone displayed (e.g., "America/New_York (EST)")
4. **Expected**: Current local time displayed

**Scenario 2: Location Form**
1. Fill in Country, City, Zip Code
2. Click "Update Location"
3. **Expected**: Success message appears
4. **Note**: Backend integration pending, so timezone won't actually update yet

---

## ☁️ AWS Testing

### 1. Deploy to AWS

```powershell
# Navigate to project root
cd C:\Users\dimam\Documents\Projects\budgetbuddy

# Deploy web app to S3 and CloudFront
.\scripts\deploy-web-app.ps1
```

**Expected Output**:
```
Building React app...
Uploading to S3...
Invalidating CloudFront cache...
✅ Deployment complete!
Live at: https://d1ueeugn9zcx7n.cloudfront.net
```

### 2. Test on CloudFront

**URL**: `https://d1ueeugn9zcx7n.cloudfront.net`

1. Open the CloudFront URL in your browser
2. Log in with your credentials
3. Run all the same tests as local testing above

### 3. Test from Different Timezones (Optional)

**Method 1: Change Browser Timezone**
1. Open Chrome DevTools (F12)
2. Press Ctrl+Shift+P (Command Palette)
3. Type "sensors"
4. Select "Show Sensors"
5. Change "Location" to different cities
6. Reload the page
7. **Expected**: Month should still be correct for that timezone

**Method 2: Change System Timezone**
1. Windows Settings → Time & Language → Date & Time
2. Change timezone to Pacific (PST)
3. Reload the app
4. **Expected**: Month calculation should use PST

---

## 🐛 Known Issues to Watch For

### Issue 1: Cache Problems
**Symptom**: Old version of app loads
**Solution**:
```powershell
# Clear browser cache (Ctrl+Shift+Delete)
# Or hard reload (Ctrl+F5)
# Or wait 5-10 minutes for CloudFront cache to invalidate
```

### Issue 2: Authentication Tokens
**Symptom**: "Unauthorized" errors
**Solution**:
```powershell
# Clear localStorage
# In browser console:
localStorage.clear()
# Then log in again
```

### Issue 3: Month Not Updating
**Symptom**: Still shows wrong month
**Solution**:
1. Check browser console for errors
2. Verify timezone detection: `Intl.DateTimeFormat().resolvedOptions().timeZone`
3. Check that `getCurrentMonthString()` is being called

---

## ✅ Success Criteria

### Timezone Fix
- [ ] On Nov 30, 2025 at 7:22 PM EST → Shows November (not December)
- [ ] "Today" button navigates to correct current month
- [ ] Console log shows correct month in timezone-aware format
- [ ] Works in different timezones (PST, CST, EST)

### Date Validation
- [ ] Warning appears when date is outside current month
- [ ] Three action buttons appear
- [ ] Yellow border on date field
- [ ] Warning message is clear and accurate

### Transaction Editing
- [ ] Double-click opens edit form
- [ ] Form pre-populates with existing data
- [ ] Modal title says "Edit Transaction"
- [ ] Updates save correctly
- [ ] Category spent amounts update correctly

### Clear Labels
- [ ] Transaction modal: "Record Actual Income/Expense"
- [ ] Budget item modal: "Add Planned [Type] Item"
- [ ] Submit buttons have correct labels
- [ ] Terminology is consistent throughout

### Settings Page
- [ ] Settings page loads at /settings
- [ ] Timezone displays correctly
- [ ] Local time displays correctly
- [ ] Location form is functional

---

## 📊 Testing Checklist

### Local Testing
- [ ] Start dev server successfully
- [ ] App loads at localhost:5173
- [ ] Login works
- [ ] Current month displays correctly
- [ ] Date validation warning works
- [ ] Transaction editing works
- [ ] Clear labels everywhere
- [ ] Settings page loads
- [ ] No console errors

### AWS Testing
- [ ] Deploy script runs successfully
- [ ] CloudFront URL loads
- [ ] Login works on production
- [ ] All features work same as local
- [ ] No CORS errors
- [ ] Data persists to DynamoDB

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if available)

### Timezone Testing
- [ ] EST timezone
- [ ] PST timezone
- [ ] UTC timezone
- [ ] Month boundaries (Nov 30 → Dec 1)

---

## 🆘 Troubleshooting

### Problem: Wrong month still showing
**Check**:
1. Browser console for errors
2. `getCurrentMonthString()` is being called
3. Timezone detection: `Intl.DateTimeFormat().resolvedOptions().timeZone`
4. Clear cache and hard reload

### Problem: Date validation not working
**Check**:
1. `currentBudgetMonth` prop is passed to TransactionForm
2. `onMonthSwitch` callback is provided
3. Check console for validation logs

### Problem: Transaction editing not working
**Check**:
1. `onEdit` callback is wired up
2. Double-click event is firing (check console)
3. Transaction data is being passed correctly

### Problem: Settings page not loading
**Check**:
1. Route is configured in App.tsx
2. SettingsPage.tsx exists
3. No import errors in console

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check network tab for failed API calls
3. Verify timezone detection in console
4. Clear cache and try again
5. Check that all files were deployed

---

**Happy Testing!** 🚀
