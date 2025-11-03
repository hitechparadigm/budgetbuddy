/**
 * TransactionPlanningModal Component Tests
 *
 * Tests the enhanced transaction planning interface including
 * category selection, recurring options, and form validation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionPlanningModal from '../TransactionPlanningModal';

// Mock the child components
jest.mock('../CategorySelector', () => {
  return function MockCategorySelector({ onCategorySelect, selectedCategoryId, error }: any) {
    return (
      <div data-testid="category-selector">
        <button
          onClick={() => onCategorySelect('cat_groceries_001', 'Groceries')}
          data-testid="select-groceries"
        >
          Select Groceries
        </button>
        {error && <span data-testid="category-error">{error}</span>}
        {selectedCategoryId && <span data-testid="selected-category">{selectedCategoryId}</span>}
      </div>
    );
  };
});

jest.mock('../RecurringOptions', () => {
  return function MockRecurringOptions({ isRecurring, onChange }: any) {
    return (
      <div data-testid="recurring-options">
        <button
          onClick={() => onChange('isRecurring', !isRecurring)}
          data-testid="toggle-recurring"
        >
          Toggle Recurring: {isRecurring ? 'ON' : 'OFF'}
        </button>
      </div>
    );
  };
});

describe('TransactionPlanningModal', () => {
  const defaultProps = {
    isOpen: true,
    type: 'expense' as const,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render expense planning modal', () => {
      render(<TransactionPlanningModal {...defaultProps} />);

      expect(screen.getByText('Plan an outcome')).toBeInTheDocument();
      expect(screen.getByTestId('category-selector')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('should render income planning modal', () => {
      render(<TransactionPlanningModal {...defaultProps} type="income" />);

      expect(screen.getByText('Plan an income')).toBeInTheDocument();
      expect(screen.getByText('Plan an income')).toHaveClass('text-green-600');
    });

    test('should not render when closed', () => {
      render(<TransactionPlanningModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Plan an outcome')).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    test('should handle amount input', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const amountInput = screen.getByLabelText('Amount');
      await user.clear(amountInput);
      await user.type(amountInput, '150.50');

      expect(amountInput).toHaveValue(150.50);
    });

    test('should handle currency selection', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const currencySelect = screen.getByDisplayValue('CAD');
      await user.selectOptions(currencySelect, 'USD');

      expect(currencySelect).toHaveValue('USD');
    });

    test('should handle date and time input', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const dateInput = screen.getByLabelText('Date');
      const timeInput = screen.getByLabelText('Time');

      await user.clear(dateInput);
      await user.type(dateInput, '2025-12-25');
      await user.clear(timeInput);
      await user.type(timeInput, '14:30');

      expect(dateInput).toHaveValue('2025-12-25');
      expect(timeInput).toHaveValue('14:30');
    });

    test('should handle Today button', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const todayButton = screen.getByText('Today');
      await user.click(todayButton);

      const today = new Date();
      const expectedDate = today.toISOString().split('T')[0];
      const expectedTime = today.toTimeString().slice(0, 5);

      expect(screen.getByLabelText('Date')).toHaveValue(expectedDate);
      expect(screen.getByLabelText('Time')).toHaveValue(expectedTime);
    });

    test('should toggle MORE section', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const moreButton = screen.getByText(/MORE/);

      // Initially collapsed
      expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument();

      // Expand
      await user.click(moreButton);
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
      expect(screen.getByTestId('recurring-options')).toBeInTheDocument();

      // Collapse
      await user.click(moreButton);
      expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    test('should handle category selection', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      const selectButton = screen.getByTestId('select-groceries');
      await user.click(selectButton);

      expect(screen.getByTestId('selected-category')).toHaveTextContent('cat_groceries_001');
    });

    test('should clear category error on selection', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      // Try to submit without category to trigger error
      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      // Select category to clear error
      const selectButton = screen.getByTestId('select-groceries');
      await user.click(selectButton);

      expect(screen.queryByTestId('category-error')).not.toBeInTheDocument();
    });
  });

  describe('Recurring Options', () => {
    test('should handle recurring toggle', async () => {
      const user = userEvent.setup();
      render(<TransactionPlanningModal {...defaultProps} />);

      // Expand MORE section
      const moreButton = screen.getByText(/MORE/);
      await user.click(moreButton);

      const toggleButton = screen.getByTestId('toggle-recurring');
      expect(toggleButton).toHaveTextContent('Toggle Recurring: OFF');

      await user.click(toggleButton);
      expect(toggleButton).toHaveTextContent('Toggle Recurring: ON');
    });
  });

  describe('Form Validation', () => {
    test('should validate required amount', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TransactionPlanningModal {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
    });

    test('should validate category selection', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TransactionPlanningModal {...defaultProps} onSubmit={onSubmit} />);

      // Set amount but no category
      const amountInput = screen.getByLabelText('Amount');
      await user.type(amountInput, '100');

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Please select a category')).toBeInTheDocument();
    });

    test('should validate date', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<TransactionPlanningModal {...defaultProps} onSubmit={onSubmit} />);

      // Set amount and category but clear date
      const amountInput = screen.getByLabelText('Amount');
      await user.type(amountInput, '100');

      const selectButton = screen.getByTestId('select-groceries');
      await user.click(selectButton);

      const dateInput = screen.getByLabelText('Date');
      await user.clear(dateInput);

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Date is required')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('should submit valid form', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      render(
        <TransactionPlanningModal
          {...defaultProps}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      );

      // Fill out form
      const amountInput = screen.getByLabelText('Amount');
      await user.type(amountInput, '150');

      const selectButton = screen.getByTestId('select-groceries');
      await user.click(selectButton);

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'expense',
            amount: 150,
            currency: 'CAD',
            categoryId: 'cat_groceries_001',
            categoryName: 'Groceries'
          })
        );
      });

      expect(onClose).toHaveBeenCalled();
    });

    test('should handle submission error', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<TransactionPlanningModal {...defaultProps} onSubmit={onSubmit} />);

      // Fill out form
      const amountInput = screen.getByLabelText('Amount');
      await user.type(amountInput, '150');

      const selectButton = screen.getByTestId('select-groceries');
      await user.click(selectButton);

      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error submitting transaction plan:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    test('should show loading state', () => {
      render(<TransactionPlanningModal {...defaultProps} loading={true} />);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByText('Creating...')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Modal Controls', () => {
    test('should handle close button', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TransactionPlanningModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByText('←');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    test('should handle cancel button', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<TransactionPlanningModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
