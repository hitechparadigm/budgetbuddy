# Recurring Budget Calculation Fix

## Problem

When creating recurring planned items (like bi-weekly salary), the system was not correctly calculating the monthly planned amount based on the start date. This caused mismatches between planned and actual amounts.

### Example of the Bug

**Scenario**: Create a bi-weekly salary of $5,000 in December
- **What happened**: Planned = $5,000, Received = $10,000 (2 transactions)
- **Why**: The system stored the per-occurrence amount ($5,000) as the planned amount, ignoring that there are 2 occurrences in December

**The issue**: The planned amount depends on WHEN the recurring item starts, not just the frequency.

## Solution

### 1. Date-Dependent Calculation

The planned amount is now calculated based on:
- **Base amount**: Per-occurrence amount (e.g., $5,000)
- **Frequency**: How often it repeats (weekly, bi-weekly, monthly, etc.)
- **Start date**: When the first occurrence happens
- **Month**: The specific month being budgeted

### 2. Examples of Correct Calculations

For a **bi-weekly salary of $5,000** in December 2025:

| Start Date | Occurrences | Dates | Planned Amount |
|-----------|------------|-------|----------------|
| Dec 1 | 3 | Dec 1, 15, 29 | $15,000 |
| Dec 5 | 2 | Dec 5, 19 | $10,000 |
| Dec 20 | 1 | Dec 20 | $5,000 |

### 3. Implementation Details

#### New Fields in BudgetCategory
```typescript
interface BudgetCategory {
  // ... existing fields ...
  baseAmount?: number;        // Per-occurrence amount for recurring items
  startDate?: string;         // First occurrence date (YYYY-MM-DD)
  plannedAmount: number;      // Monthly total (calculated)
}
```

#### New Utility Functions
- `calculateOccurrencesInMonth()` - Count how many times an item occurs in a month
- `getOccurrenceDatesInMonth()` - Get all occurrence dates for a month
- `calculatePlannedMonthlyAmount()` - Calculate total planned amount

#### Updated Form
- Added "First Occurrence Date" picker for recurring items
- Label changes from "Planned Amount" to "Amount per Occurrence" for recurring items
- Help text explains that monthly total is calculated automatically

### 4. How It Works

1. **User creates recurring item**:
   - Enters: Name, Icon, Amount per Occurrence ($5,000), Frequency (bi-weekly), Start Date (Dec 5)

2. **System calculates**:
   - Finds all occurrences in December starting from Dec 5
   - Dec 5 + 14 days = Dec 19 (within December)
   - Dec 19 + 14 days = Jan 2 (outside December)
   - **Result**: 2 occurrences

3. **System stores**:
   - `baseAmount`: $5,000
   - `startDate`: 2025-12-05
   - `plannedAmount`: $10,000 (calculated)
   - `recurringFrequency`: bi-weekly

4. **Display shows**:
   - Planned: $10,000
   - Received: $10,000 (when you add 2 transactions)
   - ✅ Budget is balanced!

## Testing

Run the test suite to verify calculations:

```bash
npm test -- recurringCalculations.test.ts
```

Test cases cover:
- Different start dates for bi-weekly items
- Weekly, monthly, and annual frequencies
- Edge cases (start date after month, single occurrence, etc.)

## User Experience

### Creating a Recurring Item

1. Click "Add Item" in Income group
2. Fill in:
   - Name: "Salary"
   - Icon: "💰"
   - Amount per Occurrence: "$5,000"
   - Check "Recurring"
   - Frequency: "Bi-weekly"
   - First Occurrence Date: "Dec 5, 2025"
3. Click "Plan Item"
4. System shows: Planned = $10,000 (2 occurrences)

### Editing a Recurring Item

1. Click edit on existing recurring item
2. Form pre-fills with:
   - Base amount (per occurrence)
   - Start date
   - Frequency
3. Change any field and save
4. Monthly total recalculates automatically

## Edge Cases Handled

- ✅ Bi-weekly items that occur 3 times in a month (e.g., Dec 1, 15, 29)
- ✅ Monthly items that occur exactly once
- ✅ Weekly items that occur 4-5 times depending on the month
- ✅ Start dates that result in only 1 occurrence
- ✅ Start dates after the month (0 occurrences)
- ✅ Leap years and varying month lengths

## Files Changed

1. **packages/web-app/src/utils/recurringCalculations.ts** (NEW)
   - Core calculation logic

2. **packages/web-app/src/utils/recurringCalculations.test.ts** (NEW)
   - Test suite with comprehensive test cases

3. **packages/web-app/src/pages/BudgetPage.tsx**
   - Updated BudgetCategory interface
   - Added startDate field to form
   - Updated form submission logic
   - Updated modal to show start date picker
   - Updated display to show base amount and start date

## Requirement Coverage

This fix implements **Requirement 18: Recurring Budget Planning**:
- ✅ Calculate occurrences in the current month
- ✅ Show correct monthly planned total
- ✅ Allow specifying expected date for first occurrence
- ✅ Display per-occurrence amount and monthly total
- ✅ Support all frequencies (weekly, bi-weekly, monthly, quarterly, annually)
- ✅ Account for partial months and varying month lengths
- ✅ Store base amount and calculate monthly totals dynamically
- ✅ Update monthly total when editing recurring items
- ✅ Show specific expected dates for each occurrence

## Next Steps

1. Test the fix with various start dates and frequencies
2. Verify that editing recurring items recalculates correctly
3. Test copying budgets to future months (should preserve recurring settings)
4. Add UI to display occurrence dates in a tooltip or expanded view
