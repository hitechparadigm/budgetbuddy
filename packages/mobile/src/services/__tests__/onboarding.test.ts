/**
 * Tests for the onboarding service.
 *
 * Asserts the exact payload POST /auth/onboarding receives — it must match
 * what the web app sends, or the two clients create different records — and
 * that a 409 resolves rather than throwing, since the budget already existing
 * is success, not failure.
 */

import { completeOnboarding, currentMonthString } from '../onboarding';
import { api } from '../api';

const postMock = api.post as jest.Mock;

/** An error in the shape the API client throws. */
function apiError(status: number, message = 'error') {
  return Object.assign(new Error(message), { status });
}

const INPUT = {
  city: 'Toronto',
  country: 'Canada',
  familySize: 3,
  currentMonth: '2026-05',
  budgetType: 'personal' as const,
  selectedCategories: [
    { name: 'Housing', icon: '🏠', adjustedAmount: 1800 },
    { name: 'Groceries', icon: '🛒', adjustedAmount: 650 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  postMock.mockResolvedValue({ data: {}, status: 200 });
});

describe('currentMonthString', () => {
  it('formats a date as YYYY-MM', () => {
    expect(currentMonthString(new Date('2026-05-17T12:00:00.000Z'))).toBe('2026-05');
    expect(currentMonthString(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01');
    expect(currentMonthString(new Date('2026-12-31T00:00:00.000Z'))).toBe('2026-12');
  });

  it('defaults to now', () => {
    expect(currentMonthString()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('completeOnboarding', () => {
  it('posts to /auth/onboarding on the main gateway', async () => {
    await completeOnboarding(INPUT);

    expect(postMock).toHaveBeenCalledTimes(1);
    const [endpoint] = postMock.mock.calls[0];
    expect(endpoint).toBe('/auth/onboarding');
  });

  it('sends the same payload shape the web app sends', async () => {
    await completeOnboarding(INPUT);

    const [, body] = postMock.mock.calls[0];
    expect(body).toEqual({
      city: 'Toronto',
      country: 'Canada',
      familySize: 3,
      currentMonth: '2026-05',
      budgetType: 'personal',
      selectedCategories: [
        { name: 'Housing', icon: '🏠', adjustedAmount: 1800 },
        { name: 'Groceries', icon: '🛒', adjustedAmount: 650 },
      ],
    });
  });

  it('forwards the selected currency', async () => {
    // The backend does not derive currency from country - it falls back to
    // 'USD' - so a dropped currency silently pins the budget, the first
    // period record and the user profile to USD.
    await completeOnboarding({ ...INPUT, currency: 'CAD' });

    const [, body] = postMock.mock.calls[0];
    expect(body.currency).toBe('CAD');
  });

  it('does not invent a currency when none is given', async () => {
    await completeOnboarding(INPUT);

    const [, body] = postMock.mock.calls[0];
    expect(body.currency).toBeUndefined();
  });

  it('reports a fresh completion', async () => {
    await expect(completeOnboarding(INPUT)).resolves.toEqual({
      alreadyCompleted: false,
    });
  });

  it('treats 409 as success, because the budget already exists', async () => {
    postMock.mockRejectedValue(apiError(409, 'Budget already exists'));

    await expect(completeOnboarding(INPUT)).resolves.toEqual({
      alreadyCompleted: true,
    });
  });

  it('rejects on any other error status', async () => {
    postMock.mockRejectedValue(apiError(500, 'Server error'));

    await expect(completeOnboarding(INPUT)).rejects.toMatchObject({ status: 500 });
  });

  it('rejects when unauthenticated', async () => {
    postMock.mockRejectedValue(apiError(401, 'Authentication required'));

    await expect(completeOnboarding(INPUT)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects an error that carries no status', async () => {
    postMock.mockRejectedValue(new Error('network down'));

    await expect(completeOnboarding(INPUT)).rejects.toThrow('network down');
  });

  it('passes an empty category list through unchanged', async () => {
    await completeOnboarding({ ...INPUT, selectedCategories: [] });

    const [, body] = postMock.mock.calls[0];
    expect(body.selectedCategories).toEqual([]);
  });
});
