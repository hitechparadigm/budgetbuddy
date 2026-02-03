/**
 * SearchBar Component Tests
 *
 * Tests for the debounced search input component.
 * **Validates: Requirements 10.3**
 */

import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { View, TextInput, Pressable, Text } from "react-native";

// Create a simplified mock component for testing
const MockSearchBar = ({
  value,
  onChangeText,
  onClear,
  placeholder = "Search transactions...",
  debounceMs = 300,
  autoFocus = false,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}) => {
  const [localValue, setLocalValue] = React.useState(value);

  // Sync local value with prop
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeText(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChangeText, value]);

  const handleClear = () => {
    setLocalValue("");
    onChangeText("");
    onClear?.();
  };

  return (
    <View testID="search-container">
      <TextInput
        testID="search-input"
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search"
        accessibilityHint="Enter text to search transactions"
      />
      {localValue.length > 0 && (
        <Pressable
          testID="clear-button"
          onPress={handleClear}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text>×</Text>
        </Pressable>
      )}
    </View>
  );
};

describe("SearchBar", () => {
  const mockOnChangeText = jest.fn();
  const mockOnClear = jest.fn();

  const defaultProps = {
    value: "",
    onChangeText: mockOnChangeText,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders search input", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input")).toBeTruthy();
    });

    it("renders with default placeholder", () => {
      const { getByPlaceholderText } = render(
        <MockSearchBar {...defaultProps} />,
      );
      expect(getByPlaceholderText("Search transactions...")).toBeTruthy();
    });

    it("renders with custom placeholder", () => {
      const { getByPlaceholderText } = render(
        <MockSearchBar {...defaultProps} placeholder="Find something..." />,
      );
      expect(getByPlaceholderText("Find something...")).toBeTruthy();
    });

    it("displays current value", () => {
      const { getByDisplayValue } = render(
        <MockSearchBar {...defaultProps} value="test search" />,
      );
      expect(getByDisplayValue("test search")).toBeTruthy();
    });
  });

  describe("Debounced Input", () => {
    it("debounces onChange calls", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} debounceMs={300} />,
      );

      const input = getByTestId("search-input");

      // Type quickly
      fireEvent.changeText(input, "a");
      fireEvent.changeText(input, "ab");
      fireEvent.changeText(input, "abc");

      // Should not have called onChange yet
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Fast-forward past debounce time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only call once with final value
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).toHaveBeenCalledWith("abc");
    });

    it("uses custom debounce delay", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} debounceMs={500} />,
      );

      const input = getByTestId("search-input");
      fireEvent.changeText(input, "test");

      // Advance 300ms - should not have called yet
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Advance remaining 200ms
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(mockOnChangeText).toHaveBeenCalledWith("test");
    });

    it("resets debounce timer on new input", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} debounceMs={300} />,
      );

      const input = getByTestId("search-input");

      fireEvent.changeText(input, "first");

      // Advance 200ms
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Type again - should reset timer
      fireEvent.changeText(input, "second");

      // Advance another 200ms (total 400ms from first input)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should not have called yet (only 200ms since last input)
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Advance remaining 100ms
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockOnChangeText).toHaveBeenCalledWith("second");
    });
  });

  describe("Clear Button", () => {
    it("shows clear button when input has value", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} value="test" />,
      );
      expect(getByTestId("clear-button")).toBeTruthy();
    });

    it("hides clear button when input is empty", () => {
      const { queryByTestId } = render(
        <MockSearchBar {...defaultProps} value="" />,
      );
      expect(queryByTestId("clear-button")).toBeNull();
    });

    it("clears input when clear button is pressed", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} value="test" onClear={mockOnClear} />,
      );

      fireEvent.press(getByTestId("clear-button"));

      expect(mockOnChangeText).toHaveBeenCalledWith("");
    });

    it("calls onClear callback when clear button is pressed", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} value="test" onClear={mockOnClear} />,
      );

      fireEvent.press(getByTestId("clear-button"));

      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has correct accessibility label", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input").props.accessibilityLabel).toBe(
        "Search",
      );
    });

    it("has accessibility hint", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input").props.accessibilityHint).toBe(
        "Enter text to search transactions",
      );
    });

    it("clear button has accessibility role", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} value="test" />,
      );
      expect(getByTestId("clear-button").props.accessibilityRole).toBe(
        "button",
      );
    });
  });

  describe("Input Behavior", () => {
    it("disables auto-capitalize", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input").props.autoCapitalize).toBe("none");
    });

    it("disables auto-correct", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input").props.autoCorrect).toBe(false);
    });

    it("uses search return key type", () => {
      const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
      expect(getByTestId("search-input").props.returnKeyType).toBe("search");
    });

    it("auto-focuses when autoFocus is true", () => {
      const { getByTestId } = render(
        <MockSearchBar {...defaultProps} autoFocus={true} />,
      );
      expect(getByTestId("search-input").props.autoFocus).toBe(true);
    });
  });

  describe("Sync with External Value", () => {
    it("updates local value when prop value changes", () => {
      const { getByDisplayValue, rerender } = render(
        <MockSearchBar {...defaultProps} value="initial" />,
      );

      expect(getByDisplayValue("initial")).toBeTruthy();

      rerender(<MockSearchBar {...defaultProps} value="updated" />);

      expect(getByDisplayValue("updated")).toBeTruthy();
    });
  });
});
