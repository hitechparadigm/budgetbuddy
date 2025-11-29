## [1.11.0] - 2025-11-28

### Added
- 🎨 **Enhanced Month Navigation UI** - Redesigned month navigation interface
  - Large month heading with year (e.g., "December 2025")
  - Budget remaining display below heading with color coding
  - "Today" button for quick navigation to current month
  - Left/right arrow buttons for prev/next month navigation
  - Orange warning badge when viewing future months
  - Empty state for future months with budget copy functionality
  - "Start Planning for [Month]" button to copy previous month's budget
  - Automatic budget creation and saving to DynamoDB

### Improved
- 📱 **Cleaner Header Design** - Removed horizontal month scroll, replaced with header-based navigation
- 💾 **Future Month Handling** - Smart budget copying that preserves structure but resets transactions
- 🎯 **User Experience** - Easier month navigation with prominent controls

### Technical
- Added `goToToday()` function for current month navigation
- Added `isFutureMonth()` function to detect future month viewing
- Added `copyPreviousMonthBudget()` function to copy budget structure
- Budget copying resets spent amounts and transactions to zero
- New budgets automatically saved to DynamoDB via API
