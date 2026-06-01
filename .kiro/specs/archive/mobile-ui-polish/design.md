# Mobile UI Polish - Design Document

**Last Updated**: 2026-02-02
**Status**: Ready for Implementation
**Spec**: `.kiro/specs/mobile-ui-polish/`

## Overview

This document details the technical design for implementing mobile-specific UI polish features in the React Native app. All features have web equivalents that serve as reference implementations.

---

## Architecture Overview

### Component Structure

```
packages/mobile/src/
├── components/
│   ├── QuickActionsFAB.tsx      # NEW - Floating action button
│   ├── TransactionTemplateModal.tsx  # NEW - Template management
│   ├── SearchBar.tsx            # NEW - Transaction search
│   ├── FilterSheet.tsx          # NEW - Filter bottom sheet
│   ├── SwipeableTipCard.tsx     # NEW - Swipeable tips
│   ├── TwoFactorSetup.tsx       # NEW - 2FA setup wizard
│   └── TwoFactorVerify.tsx      # NEW - 2FA code input
├── screens/
│   ├── GoalsScreen.tsx          # UPDATE - Add drag-and-drop
│   ├── TipsScreen.tsx           # UPDATE - Add swipe gestures
│   ├── TransactionsScreen.tsx   # UPDATE - Add search/filter
│   └── SettingsScreen.tsx       # UPDATE - Add 2FA section
└── hooks/
    ├── useHaptics.ts            # NEW - Haptic feedback hook
    └── useTemplates.ts          # NEW - Template management hook
```

### Dependencies

```json
{
  "react-native-reanimated": "^3.x",
  "react-native-gesture-handler": "^2.x",
  "expo-haptics": "^12.x",
  "@react-native-async-storage/async-storage": "^1.x"
}
```

---

## Component Designs

### 1. QuickActionsFAB Component

**File**: `packages/mobile/src/components/QuickActionsFAB.tsx`

**Props Interface**:

```typescript
interface QuickActionsFABProps {
  onAddTransaction: () => void;
  onScanReceipt: () => void;
  onViewBudget: () => void;
}
```

**Implementation Details**:

- Uses `react-native-reanimated` for smooth spring animations
- Expanded state managed with `useSharedValue`
- Actions rendered as `Animated.View` with staggered entry
- Backdrop overlay when expanded
- Haptic feedback via `expo-haptics`

**Animation Specs**:

- FAB rotation: 0° → 45° on expand
- Action buttons: scale 0 → 1 with spring (damping: 15, stiffness: 150)
- Stagger delay: 50ms between actions
- Backdrop: opacity 0 → 0.5

**Accessibility**:

- `accessibilityRole="button"`
- `accessibilityLabel="Quick Actions, double tap to expand"`
- `accessibilityState={{ expanded: isExpanded }}`

---

### 2. TransactionTemplateModal Component

**File**: `packages/mobile/src/components/TransactionTemplateModal.tsx`

**Props Interface**:

```typescript
interface TransactionTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TransactionTemplate) => void;
  onSaveTemplate?: (transaction: Transaction) => void;
}

interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  categoryId: string;
  createdAt: string;
}
```

**Storage Schema** (AsyncStorage):

```typescript
// Key: 'budgetbuddy_transaction_templates'
interface TemplateStorage {
  templates: TransactionTemplate[];
  recentCategories: string[]; // Last 5 used category IDs
}
```

**Implementation Details**:

- Bottom sheet modal using `@gorhom/bottom-sheet`
- FlatList for template list with swipe-to-delete
- "Save as Template" form with name input
- Recent categories shown as chips

---

### 3. SearchBar and FilterSheet Components

**File**: `packages/mobile/src/components/SearchBar.tsx`

**Props Interface**:

```typescript
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}
```

**File**: `packages/mobile/src/components/FilterSheet.tsx`

**Props Interface**:

```typescript
interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  categories: Category[];
}

interface TransactionFilters {
  search: string;
  categoryIds: string[];
  dateRange: { start: Date | null; end: Date | null };
  amountRange: { min: number | null; max: number | null };
  type: "all" | "income" | "expense";
}
```

**Implementation Details**:

- SearchBar: TextInput with debounce (300ms)
- FilterSheet: Bottom sheet with sections
- Category filter: Multi-select chips
- Date range: DateTimePicker integration
- Amount range: Dual slider or text inputs

---

### 4. Goal Drag-and-Drop (GoalsScreen Update)

**File**: `packages/mobile/src/screens/GoalsScreen.tsx`

**Implementation Approach**:

- Use `react-native-reanimated` + `react-native-gesture-handler`
- `PanGestureHandler` for drag detection
- `useAnimatedGestureHandler` for gesture handling
- `useAnimatedStyle` for position updates

**Drag State Machine**:

```
IDLE → (long press) → DRAGGING → (release) → ANIMATING → IDLE
```

**Key Functions**:

```typescript
// Gesture handler
const gestureHandler = useAnimatedGestureHandler({
  onStart: (_, ctx) => {
    ctx.startY = translateY.value;
    runOnJS(triggerHaptic)("medium");
  },
  onActive: (event, ctx) => {
    translateY.value = ctx.startY + event.translationY;
    // Calculate new index based on position
  },
  onEnd: () => {
    // Animate to final position
    // Call reorder API
  },
});
```

**API Call**:

```typescript
PUT /goals/reorder
Body: { goalIds: string[] } // New order
```

---

### 5. TwoFactorSetup and TwoFactorVerify Components

**File**: `packages/mobile/src/components/TwoFactorSetup.tsx`

**Props Interface**:

```typescript
interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}
```

**Wizard Steps**:

1. **Intro**: Explain 2FA benefits, "Get Started" button
2. **QR Code**: Display QR for authenticator app, manual code option
3. **Verify**: Enter 6-digit code to confirm setup
4. **Backup**: Display backup codes, copy/download option

**File**: `packages/mobile/src/components/TwoFactorVerify.tsx`

**Props Interface**:

```typescript
interface TwoFactorVerifyProps {
  onVerify: (code: string) => Promise<void>;
  onUseBackupCode: () => void;
  error?: string;
}
```

**Implementation Details**:

- 6 individual TextInput boxes for code entry
- Auto-focus next input on digit entry
- Auto-submit when 6 digits entered
- Keyboard type: `number-pad`

---

### 6. SwipeableTipCard Component

**File**: `packages/mobile/src/components/SwipeableTipCard.tsx`

**Props Interface**:

```typescript
interface SwipeableTipCardProps {
  tip: Tip;
  onSave: (tipId: string) => void;
  onDismiss: (tipId: string) => void;
  isRead: boolean;
}
```

**Swipe Thresholds**:

- Save threshold: -80px (swipe left)
- Dismiss threshold: 80px (swipe right)
- Snap back if < threshold

**Visual Feedback**:

- Left swipe: Green background, bookmark icon
- Right swipe: Red background, X icon
- Opacity interpolation based on swipe distance

**Implementation**:

```typescript
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
    // Interpolate background color and icon opacity
  })
  .onEnd((e) => {
    if (e.translationX < -SAVE_THRESHOLD) {
      runOnJS(onSave)(tip.id);
      translateX.value = withTiming(-SCREEN_WIDTH);
    } else if (e.translationX > DISMISS_THRESHOLD) {
      runOnJS(onDismiss)(tip.id);
      translateX.value = withTiming(SCREEN_WIDTH);
    } else {
      translateX.value = withSpring(0);
    }
  });
```

---

## Hooks

### useHaptics Hook

**File**: `packages/mobile/src/hooks/useHaptics.ts`

```typescript
import * as Haptics from "expo-haptics";

export function useHaptics() {
  const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const medium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const heavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  const success = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  const error = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  return { light, medium, heavy, success, error };
}
```

### useTemplates Hook

**File**: `packages/mobile/src/hooks/useTemplates.ts`

```typescript
interface UseTemplatesReturn {
  templates: TransactionTemplate[];
  recentCategories: string[];
  saveTemplate: (
    template: Omit<TransactionTemplate, "id" | "createdAt">,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  updateTemplate: (
    id: string,
    updates: Partial<TransactionTemplate>,
  ) => Promise<void>;
  addRecentCategory: (categoryId: string) => Promise<void>;
}
```

---

## Correctness Properties

### Property 1: FAB Animation Consistency

- FAB always returns to closed state after action selection
- Animation never leaves FAB in intermediate state
- Backdrop always matches FAB expanded state

### Property 2: Template Storage Integrity

- Templates never exceed MAX_TEMPLATES (10)
- Template IDs are unique
- Deleted templates are removed from storage

### Property 3: Filter State Consistency

- Applied filters always match displayed results
- Clear filters resets all filter values
- Filter count badge matches active filter count

### Property 4: Drag-and-Drop Order Preservation

- Goal order after drag matches visual order
- Failed API call reverts to previous order
- Concurrent drags are prevented

### Property 5: 2FA Code Validation

- Only 6-digit numeric codes accepted
- Invalid codes show error message
- Successful verification completes setup

### Property 6: Swipe Gesture Determinism

- Swipe past threshold always triggers action
- Swipe below threshold always snaps back
- No gesture can trigger both save and dismiss

---

## Testing Strategy

### Unit Tests

- Component rendering with various props
- Hook state management
- Animation value calculations

### Integration Tests

- Template save/load cycle
- Filter application and results
- 2FA setup flow completion

### Property-Based Tests

- Gesture threshold boundaries
- Template storage limits
- Filter combination validity

---

## Migration Notes

### From Web Components

- `QuickActionsFAB.tsx` (web) → Adapt for native gestures
- `TransactionFilters.tsx` (web) → Convert to bottom sheet
- `TwoFactorSetup.tsx` (web) → Adapt for mobile keyboard
- `TwoFactorVerify.tsx` (web) → Adapt for mobile input

### Shared Logic

- Filter logic can be shared via `packages/shared`
- Template schema matches web implementation
- 2FA API calls identical to web

---

## Performance Considerations

- Use `useMemo` for expensive filter calculations
- Virtualize long lists with `FlatList`
- Debounce search input (300ms)
- Use `worklet` functions for gesture handlers
- Avoid JS thread for animations (use Reanimated)

---

## Accessibility Checklist

- [ ] All interactive elements have accessible labels
- [ ] Gestures have alternative button actions
- [ ] Focus management in modals
- [ ] Screen reader announcements for state changes
- [ ] Minimum touch targets (44x44)
- [ ] Color contrast meets WCAG AA
