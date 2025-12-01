# Timezone Bug Fix - Critical Issue

## 🐛 Bug Description

**Date**: November 30, 2025, 7:22 PM EST
**Expected**: Show November budget
**Actual**: Shows December budget
**Severity**: HIGH - Affects all users

## Root Cause

The application uses `new Date().toISOString()` which returns UTC time, not the user's local time.

**Time Conversion**:
```
Nov 30, 2025, 7:22 PM EST = Nov 30, 2025, 19:22 EST
Nov 30, 2025, 19:22 EST = Dec 1, 2025, 00:22 UTC (5 hours ahead)
```

When the app calls `new Date().toISOString().slice(0, 7)`, it returns `"2025-12"` instead of `"2025-11"`.

## ✅ Solution Implemented

### 1. Created Timezone Utility Functions

**File**: `packages/web-app/src/utils/timezoneHelpers.ts`

Key functions:
- `detectUserTimezone()` - Detects user's IANA timezone (e.g., "America/New_York")
- `getCurrentDateInTimezone(timezone)` - Gets current date in user's timezone
- `getCurrentMonthInTimezone(timezone)` - Gets current month/year in user's timezone
- `formatDateInTimezone()` - Formats dates in user's timezone
- `isTodayInTimezone()` - Checks if a date is today in user's timezone

### 2. Created Month Helper Functions

**File**: `packages/web-app/src/utils/monthHelpers.ts`

Key functions:
- `getCurrentMonthString(timezone?)` - Returns "YYYY-MM" in user's timezone
- `getTodayString(timezone?)` - Returns "YYYY-MM-DD" in user's timezone
- `isFutureMonth(monthString, timezone?)` - Checks if month is in the future
- `isPastMonth(monthString, timezone?)` - Checks if month is in the past
- `isCurrentMonth(monthString, timezone?)` - Checks if month is current

## 🔧 Required Changes to BudgetPage.tsx

### Change 1: Import the helpers

```typescript
import { getCurrentMonthString, getTodayString, isFutureMonth, isPastMonth } from '../utils/monthHelpers';
import { detectUserTimezone } from '../utils/timezoneHelpers';
```

### Change 2: Fix currentMonth initialization

**BEFORE (BUGGY)**:
```typescript
const [currentMonth, setCurrentMonth] = useState(() => {
  const today = new Date().toISOString().slice(0, 7);
  console.log('Initial currentMonth state:', today);
  return today;
});
```

**AFTER (FIXED)**:
```typescript
const [currentMonth, setCurrentMonth] = useState(() => {
  const today = getCurrentMonthString();
  console.log('Initial currentMonth state:', today);
  return today;
});
```

### Change 3: Fix transaction form date initialization

**BEFORE**:
```typescript
date: new Date().toISOString().split('T')[0]
```

**AFTER**:
```typescript
date: getTodayString()
```

### Change 4: Fix goToToday function

**BEFORE**:
```typescript
const goToToday = () => {
  const today = new Date().toISOString().slice(0, 7);
  console.log('goToToday called, setting month to:', today);
  setCurrentMonth(today);
};
```

**AFTER**:
```typescript
const goToToday = () => {
  const today = getCurrentMonthString();
  console.log('goToToday called, setting month to:', today);
  setCurrentMonth(today);
};
```

### Change 5: Fix isFutureMonth function

**BEFORE**:
```typescript
const isFutureMonth = () => {
  const today = new Date();
  const [year, month] = currentMonth.split('-').map(Number);
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonthNum) return true;
  return false;
};
```

**AFTER**:
```typescript
const isFutureMonthCheck = () => {
  return isFutureMonth(currentMonth);
};
```

### Change 6: Fix isPastMonth function

**BEFORE**:
```typescript
const isPastMonth = () => {
  const today = new Date();
  const [year, month] = currentMonth.split('-').map(Number);
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonthNum) return true;
  return false;
};
```

**AFTER**:
```typescript
const isPastMonthCheck = () => {
  return isPastMonth(currentMonth);
};
```

## 📋 Testing Checklist

After applying the fix, test the following scenarios:

- [ ] On Nov 30, 2025 at 7:22 PM EST → Should show November budget
- [ ] On Nov 30, 2025 at 11:59 PM EST → Should show November budget
- [ ] On Dec 1, 2025 at 12:00 AM EST → Should show December budget
- [ ] Test with different timezones (PST, CST, EST)
- [ ] Test "Today" button navigates to correct month
- [ ] Test future month detection works correctly
- [ ] Test past month detection works correctly
- [ ] Test transaction date defaults to today in user's timezone

## 🚀 Next Steps

1. **Immediate Fix** (Priority 1):
   - Update BudgetPage.tsx with the changes above
   - Test thoroughly with different timezones
   - Deploy to production

2. **User Profile Enhancement** (Priority 2):
   - Add timezone field to User model
   - Store detected timezone on registration
   - Load timezone from user profile on login
   - Add Settings page for location/timezone management

3. **Complete Implementation** (Priority 3):
   - Update all date displays to use timezone helpers
   - Update TransactionForm to use timezone-aware dates
   - Update date validation to use user's timezone
   - Add timezone to API requests/responses

## 📝 Documentation Updates

- [x] Added Requirement 13 to requirements.md
- [x] Added design details to design.md
- [x] Created timezone utility functions (`timezoneHelpers.ts`)
- [x] Created month helper functions (`monthHelpers.ts`)
- [x] Updated BudgetPage.tsx with timezone fixes
- [x] Added timezone and location to User model
- [x] Created Settings page for location management

## 🎯 Success Criteria

The bug will be considered fixed when:
1. On Nov 30, 2025 at 7:22 PM EST, the app shows November budget (not December)
2. All date calculations respect the user's local timezone
3. Users can update their location/timezone in Settings
4. Timezone is persisted in user profile
5. All tests pass

## 📞 Support

If you encounter any issues with the timezone fix, please check:
1. Browser console for timezone detection logs
2. Verify `Intl.DateTimeFormat().resolvedOptions().timeZone` returns correct timezone
3. Check that all date calculations use the helper functions
4. Ensure no code is still using `new Date().toISOString()` directly
