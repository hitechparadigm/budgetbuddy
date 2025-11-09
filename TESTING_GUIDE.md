# BudgetBuddy Testing Guide

## **🚀 Quick Start - Test in 5 Minutes**

### **Step 1: Verify Everything is Running**
```bash
npm run test:journey
```
This checks that all services are healthy and ready.

### **Step 2: Open Your Browser**
Visit: **http://localhost:5173/**

You should see the BudgetBuddy application!

---

## **🧪 What You Can Test Right Now**

### **1. Test Page (No Authentication Required)**

**URL**: http://localhost:5173/test/transactions

**What to test:**
- ✅ Health check status (should show green)
- ✅ Create transaction form
- ✅ Transaction list view
- ✅ Summary calculations
- ✅ Delete transactions

**Expected behavior:**
- Health check shows "✅ transactions service is healthy"
- Creating transactions will fail with auth error (this is correct!)
- Form validation works (try submitting empty form)

---

### **2. Navigation & Layout**

**URL**: http://localhost:5173/dashboard (or any protected route)

**What to test:**
- ✅ Navigation bar appears at top
- ✅ Navigation links: Dashboard, Transactions, Budget, Test
- ✅ Active page is highlighted in navigation
- ✅ Responsive design (resize browser window)
- ✅ Clean, professional styling

---

### **3. Transaction Management Page**

**URL**: http://localhost:5173/transactions

**What to test:**
- ✅ Summary cards showing totals
- ✅ "Add Transaction" button
- ✅ Filter controls (type, date range)
- ✅ Transaction list view
- ✅ Edit/Delete buttons on transactions

**Note**: You'll need to be authenticated to see data. Without auth, you'll see the login page.

---

### **4. Budget Dashboard**

**URL**: http://localhost:5173/budget

**What to test:**
- ✅ Budget overview cards (income, expenses, savings, balance)
- ✅ Month selector dropdown
- ✅ Category progress bars
- ✅ Color-coded progress (green/yellow/red)
- ✅ Remaining amounts for each category

**Note**: Requires authentication and existing budget data.

---

## **🔐 Testing with Authentication**

### **Option A: Create a Test User**

```bash
npm run create-test-user
```

This creates a test user with:
- **Email**: testuser@example.com
- **Password**: TempPassword123!
- **Family ID**: family_test_001

### **Option B: Use Existing Test User**

If you already have a test user, use those credentials.

### **Login Flow Test:**

1. Visit: http://localhost:5173/auth
2. Enter credentials
3. Click "Login"
4. Should redirect to dashboard
5. Navigation should appear
6. All pages should be accessible

---

## **💳 Testing Transaction Features**

### **Create Transaction Test:**

1. Go to: http://localhost:5173/transactions
2. Click "Add Transaction"
3. Fill in the form:
   - **Type**: Choose Income or Expense
   - **Amount**: Enter any positive number (e.g., 50.00)
   - **Category**: Select from dropdown
   - **Description**: Enter description
   - **Merchant**: (Optional) Enter merchant name
   - **Date**: Select date
4. Click "Add Transaction"
5. Transaction should appear in the list
6. Summary cards should update

### **Edit Transaction Test:**

1. Find a transaction in the list
2. Click "Edit" button
3. Modify any field
4. Click "Update Transaction"
5. Changes should be reflected immediately

### **Delete Transaction Test:**

1. Find a transaction in the list
2. Click "Delete" button
3. Confirm deletion
4. Transaction should disappear
5. Summary should update

### **Filter Transactions Test:**

1. Use the filter controls:
   - **Type**: Select "Income" or "Expense"
   - **From Date**: Select start date
   - **To Date**: Select end date
2. Click "Clear Filters" to reset

---

## **💰 Testing Budget Features**

### **View Budget Test:**

1. Go to: http://localhost:5173/budget
2. Should see:
   - Budget overview cards at top
   - Income, Savings, Expenses sections
   - Progress bars for each category
   - Remaining amounts

### **Month Navigation Test:**

1. Use the month selector dropdown
2. Select different months
3. Budget data should update

### **Progress Indicators Test:**

1. Look at category progress bars
2. Colors should indicate status:
   - **Green**: Under 50% spent
   - **Yellow**: 50-80% spent
   - **Red**: Over 80% spent

---

## **🎨 Testing UI/UX Features**

### **Responsive Design Test:**

1. Resize browser window
2. Test on different screen sizes:
   - Desktop (1200px+)
   - Tablet (768px-1200px)
   - Mobile (< 768px)
3. Navigation should adapt
4. Cards should reflow
5. Forms should remain usable

### **Error Handling Test:**

1. Try creating transaction with invalid data:
   - Negative amount
   - Empty description
   - No category selected
2. Should see field-specific error messages
3. Form should not submit

### **Loading States Test:**

1. Watch for loading indicators when:
   - Fetching transactions
   - Creating/updating transactions
   - Loading budget data
2. Buttons should show "Loading..." or "Saving..."

---

## **🔧 Backend API Testing**

### **Test API Health:**

```bash
# Test all services
npm run test:journey

# Test specific endpoints
curl http://localhost:5173/test/transactions
```

### **Test Transaction API:**

```bash
# Health check (no auth required)
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions/health

# Get transactions (requires auth)
# You'll get 401 Unauthorized - this is correct!
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions
```

### **Test Budget API:**

```bash
# Health check
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget/health

# Get budgets (requires auth)
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget
```

---

## **📊 Visual Testing Checklist**

### **Navigation Bar:**
- [ ] Logo/brand name visible
- [ ] All navigation links present
- [ ] Active page highlighted
- [ ] User menu button visible
- [ ] Responsive on mobile

### **Transaction Page:**
- [ ] Summary cards display correctly
- [ ] "Add Transaction" button works
- [ ] Filter controls functional
- [ ] Transaction list displays
- [ ] Edit/Delete buttons work
- [ ] Modal form appears correctly

### **Budget Page:**
- [ ] Overview cards show totals
- [ ] Month selector works
- [ ] Progress bars display
- [ ] Colors are correct
- [ ] Categories are organized
- [ ] Amounts are formatted

### **Forms:**
- [ ] All fields render correctly
- [ ] Validation works
- [ ] Error messages display
- [ ] Submit buttons work
- [ ] Cancel buttons work
- [ ] Loading states show

---

## **🐛 Common Issues & Solutions**

### **Issue: "Cannot connect to localhost:5173"**
**Solution**:
```bash
# Start the frontend
npm run dev:web
```

### **Issue: "401 Unauthorized" errors**
**Solution**: This is expected! Protected endpoints require authentication.
1. Create a test user: `npm run create-test-user`
2. Login through the UI
3. Try again

### **Issue: "No transactions found"**
**Solution**: You need to create transactions first!
1. Go to http://localhost:5173/transactions
2. Click "Add Transaction"
3. Fill in the form and submit

### **Issue: "No budget found"**
**Solution**: You need to create a budget first!
1. Use the budget API or
2. Create through the UI (if implemented)

### **Issue: Frontend not updating**
**Solution**:
```bash
# Restart the frontend
# Stop current process (Ctrl+C)
npm run dev:web
```

---

## **✅ Success Criteria**

You've successfully tested the application when:

- [ ] All health checks pass
- [ ] Frontend loads without errors
- [ ] Navigation works between pages
- [ ] Forms validate input correctly
- [ ] Transactions can be created/edited/deleted
- [ ] Budget displays with progress bars
- [ ] Summary calculations are correct
- [ ] Responsive design works on mobile
- [ ] Error messages are user-friendly
- [ ] Loading states display properly

---

## **🎯 Next Steps After Testing**

1. **Report Issues**: Note any bugs or unexpected behavior
2. **Suggest Improvements**: UI/UX enhancements
3. **Test Edge Cases**: Try unusual inputs or workflows
4. **Performance Testing**: Test with many transactions
5. **Browser Testing**: Test in Chrome, Firefox, Safari, Edge

---

## **📞 Need Help?**

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the terminal for backend errors
3. Run `npm run test:journey` to verify services
4. Review the DEVELOPMENT_QUICK_START.md guide

**Happy Testing! 🚀**
