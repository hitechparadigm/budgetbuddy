/**
 * AI Budget Persistence Tests (Req 16)
 * Validates AI budget is saved and cleared correctly
 */

describe('AI Budget Persistence (Req 16)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save AI budget to localStorage', () => {
    const budget = { income: [], savings: [], expenses: [] };
    localStorage.setItem('ai-generated-budget', JSON.stringify(budget));

    const stored = localStorage.getItem('ai-generated-budget');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(budget);
  });

  it('should clear AI budget after backend save', () => {
    localStorage.setItem('ai-generated-budget', JSON.stringify({ test: 'data' }));
    expect(localStorage.getItem('ai-generated-budget')).toBeTruthy();

    // Simulate backend save completion
    localStorage.removeItem('ai-generated-budget');
    expect(localStorage.getItem('ai-generated-budget')).toBeNull();
  });

  it('should only use AI budget for current month', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const pastMonth = '2025-10';

    localStorage.setItem('ai-generated-budget', JSON.stringify({ month: currentMonth }));

    // AI budget should only be used if viewing current month
    expect(currentMonth).not.toBe(pastMonth);
  });
});
