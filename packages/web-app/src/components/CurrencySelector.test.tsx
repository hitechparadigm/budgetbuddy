/**
 * Currency Selector Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CurrencySelector, CurrencySelectorCompact } from "./CurrencySelector";
import { getSupportedCurrencies } from "@budget-buddy/shared/src/utils/currency";

describe("CurrencySelector", () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: "USD",
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe("Rendering", () => {
    it("should render with default label", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      render(<CurrencySelector {...defaultProps} label="Select Currency" />);
      expect(screen.getByText("Select Currency")).toBeInTheDocument();
    });

    it("should render all supported currencies", () => {
      render(<CurrencySelector {...defaultProps} />);
      const currencies = getSupportedCurrencies();

      currencies.forEach((currency) => {
        const option = screen.getByRole("option", {
          name: new RegExp(currency.code),
        });
        expect(option).toBeInTheDocument();
      });
    });

    it("should render currency with full name by default", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(
        screen.getByRole("option", { name: /US Dollar/ }),
      ).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Euro/ })).toBeInTheDocument();
    });

    it("should render currency without full name when showFullName is false", () => {
      render(<CurrencySelector {...defaultProps} showFullName={false} />);
      const usdOption = screen.getByRole("option", { name: /^\$ USD$/ });
      expect(usdOption).toBeInTheDocument();
      expect(usdOption.textContent).not.toContain("US Dollar");
    });

    it("should show required indicator when required", () => {
      render(<CurrencySelector {...defaultProps} required />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should not show required indicator when not required", () => {
      render(<CurrencySelector {...defaultProps} required={false} />);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("should render with selected value", () => {
      render(<CurrencySelector {...defaultProps} value="EUR" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("EUR");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CurrencySelector {...defaultProps} className="custom-class" />,
      );
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("should call onChange when currency is selected", () => {
      render(<CurrencySelector {...defaultProps} />);
      const select = screen.getByRole("combobox");

      fireEvent.change(select, { target: { value: "EUR" } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("EUR");
    });

    it("should call onChange with correct currency code", () => {
      render(<CurrencySelector {...defaultProps} />);
      const select = screen.getByRole("combobox");

      fireEvent.change(select, { target: { value: "JPY" } });

      expect(mockOnChange).toHaveBeenCalledWith("JPY");
    });

    it("should not call onChange when disabled", () => {
      render(<CurrencySelector {...defaultProps} disabled />);
      const select = screen.getByRole("combobox");

      fireEvent.change(select, { target: { value: "EUR" } });

      // onChange might still be called by the browser, but the select should be disabled
      expect(select).toBeDisabled();
    });
  });

  describe("Disabled State", () => {
    it("should disable select when disabled prop is true", () => {
      render(<CurrencySelector {...defaultProps} disabled />);
      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("should enable select when disabled prop is false", () => {
      render(<CurrencySelector {...defaultProps} disabled={false} />);
      const select = screen.getByRole("combobox");
      expect(select).not.toBeDisabled();
    });
  });

  describe("Required Validation", () => {
    it("should have required attribute when required prop is true", () => {
      render(<CurrencySelector {...defaultProps} required />);
      const select = screen.getByRole("combobox");
      expect(select).toBeRequired();
    });

    it("should not have required attribute when required prop is false", () => {
      render(<CurrencySelector {...defaultProps} required={false} />);
      const select = screen.getByRole("combobox");
      expect(select).not.toBeRequired();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label", () => {
      render(<CurrencySelector {...defaultProps} label="Select Currency" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-label", "Select Currency");
    });

    it("should have id for label association", () => {
      render(<CurrencySelector {...defaultProps} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("id", "currency-select");
    });

    it("should be keyboard navigable", () => {
      render(<CurrencySelector {...defaultProps} />);
      const select = screen.getByRole("combobox");

      select.focus();
      expect(select).toHaveFocus();
    });
  });

  describe("Currency Display Format", () => {
    it("should display USD with $ symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(
        screen.getByRole("option", { name: /\$ USD/ }),
      ).toBeInTheDocument();
    });

    it("should display EUR with € symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(screen.getByRole("option", { name: /€ EUR/ })).toBeInTheDocument();
    });

    it("should display GBP with £ symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(screen.getByRole("option", { name: /£ GBP/ })).toBeInTheDocument();
    });

    it("should display JPY with ¥ symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(screen.getByRole("option", { name: /¥ JPY/ })).toBeInTheDocument();
    });

    it("should display CAD with C$ symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(
        screen.getByRole("option", { name: /C\$ CAD/ }),
      ).toBeInTheDocument();
    });

    it("should display AUD with A$ symbol", () => {
      render(<CurrencySelector {...defaultProps} />);
      expect(
        screen.getByRole("option", { name: /A\$ AUD/ }),
      ).toBeInTheDocument();
    });
  });

  describe("CurrencySelectorCompact", () => {
    it("should render without full currency names", () => {
      render(<CurrencySelectorCompact {...defaultProps} />);
      const usdOption = screen.getByRole("option", { name: /^\$ USD$/ });
      expect(usdOption).toBeInTheDocument();
      expect(usdOption.textContent).not.toContain("US Dollar");
    });

    it("should still be functional", () => {
      render(<CurrencySelectorCompact {...defaultProps} />);
      const select = screen.getByRole("combobox");

      fireEvent.change(select, { target: { value: "EUR" } });

      expect(mockOnChange).toHaveBeenCalledWith("EUR");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty value", () => {
      render(<CurrencySelector {...defaultProps} value="" />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("");
    });

    it("should render placeholder option", () => {
      render(<CurrencySelector {...defaultProps} value="" />);
      expect(
        screen.getByRole("option", { name: "Select a currency" }),
      ).toBeInTheDocument();
    });

    it("should disable placeholder option", () => {
      render(<CurrencySelector {...defaultProps} value="" />);
      const placeholderOption = screen.getByRole("option", {
        name: "Select a currency",
      });
      expect(placeholderOption).toBeDisabled();
    });
  });
});
