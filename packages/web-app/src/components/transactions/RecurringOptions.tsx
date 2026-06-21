import React from 'react';

interface RecurringOptionsProps {
  isRecurring: boolean;
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually' | 'custom';
  customInterval?: number;
  onLastDayOfMonth?: boolean;
  endDate?: string;
  onChange: (field: string, value: any) => void;
}

export const RecurringOptions: React.FC<RecurringOptionsProps> = ({
  isRecurring,
  frequency,
  customInterval,
  onLastDayOfMonth,
  endDate,
  onChange
}) => {
  const frequencyOptions = [
    { value: 'weekly', label: 'Every week' },
    { value: 'bi-weekly', label: 'Every two weeks' },
    { value: 'monthly', label: 'Every month' },
    { value: 'annually', label: 'Every year' },
    { value: 'custom', label: 'Custom' }
  ];

  return (
    <div className="space-y-4">
      {/* Recurring Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Make this recurring
        </label>
        <button
          type="button"
          onClick={() => onChange('isRecurring', !isRecurring)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRecurring ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] transition-transform ${
              isRecurring ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-4 border-l-2 border-gray-600">
          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Repeat
            </label>
            <select
              value={frequency || 'monthly'}
              onChange={(e) => onChange('frequency', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--color-primary)]"
            >
              {frequencyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Interval */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Repeats every
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={customInterval || 1}
                  onChange={(e) => onChange('customInterval', parseInt(e.target.value) || 1)}
                  className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
                <select
                  value="months" // Default to months for custom intervals
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                  <option value="years">years</option>
                </select>
              </div>
            </div>
          )}

          {/* On Last Day of Month */}
          {(frequency === 'monthly' || frequency === 'custom') && (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="lastDayOfMonth"
                checked={onLastDayOfMonth || false}
                onChange={(e) => onChange('onLastDayOfMonth', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="lastDayOfMonth" className="text-sm text-gray-300">
                On last day of month
              </label>
            </div>
          )}

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ends
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="neverEnd"
                  name="endType"
                  checked={!endDate}
                  onChange={() => onChange('endDate', undefined)}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600"
                />
                <label htmlFor="neverEnd" className="text-sm text-gray-300">
                  Never
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="endOnDate"
                  name="endType"
                  checked={!!endDate}
                  onChange={() => {
                    if (!endDate) {
                      const futureDate = new Date();
                      futureDate.setMonth(futureDate.getMonth() + 12);
                      onChange('endDate', futureDate.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600"
                />
                <label htmlFor="endOnDate" className="text-sm text-gray-300">
                  On date
                </label>
              </div>

              {endDate && (
                <div className="ml-7">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onChange('endDate', e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Preview</h4>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {getRecurringPreview(frequency, customInterval, onLastDayOfMonth, endDate)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

function getRecurringPreview(
  frequency?: string,
  customInterval?: number,
  onLastDayOfMonth?: boolean,
  endDate?: string
): string {
  if (!frequency) return 'This transaction will occur once.';

  let preview = 'This transaction will repeat ';

  switch (frequency) {
    case 'weekly':
      preview += 'every week';
      break;
    case 'bi-weekly':
      preview += 'every two weeks';
      break;
    case 'monthly':
      preview += onLastDayOfMonth ? 'on the last day of every month' : 'every month';
      break;
    case 'annually':
      preview += 'every year';
      break;
    case 'custom':
      const interval = customInterval || 1;
      preview += `every ${interval} month${interval > 1 ? 's' : ''}`;
      if (onLastDayOfMonth) {
        preview += ' on the last day';
      }
      break;
    default:
      preview += 'based on your settings';
  }

  if (endDate) {
    const endDateObj = new Date(endDate);
    preview += ` until ${endDateObj.toLocaleDateString()}`;
  } else {
    preview += ' indefinitely';
  }

  return preview + '.';
}

export default RecurringOptions;
