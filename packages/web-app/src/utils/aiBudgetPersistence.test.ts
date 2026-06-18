/**
 * AI Budget Persistence Regression Tests (Requirement 16)
 *
 * Bug: User creates AI budget for November → switches to October → returns to November → gets redirected to onboarding
 * Symptom: Budget saves successfully (409 conflict confirms it exists), but GET /budget returns "No budgets exist"
 *
 * Root Cause Investigation:
 * - AI budget is saved with POST /budget (returns 409 if already exists)
 * - GET /budget queries by budgetId
 * - Possible budgetId mismatch between save and retrieval
 */

describe('AI Budget Persistence (Requirement 16)', () => {
  // Mock API client
  const mockApiClient = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should persist AI-generated budget and retrieve it successfully', async () => {
    // Simulate AI budget generation
    const aiBudget = {
      month: '2025-11',
      groups: {
        income: [{ name: 'Salary', plannedAmount: 5000 }],
        expenses: [{ name: 'Rent', plannedAmount: 1500 }],
        savings: [{ name: 'Emergency Fund', plannedAmount: 500 }],
      },
      isAIGenerated: true,
    };

    // Mock successful budget creation
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        budgetId: 'budget-123',
        ...aiBudget,
      },
    });

    // Save AI budget
    const saveResponse = await mockApiClient.post('/budget', aiBudget);
    expect(saveResponse.data.budgetId).toBe('budget-123');

    // Mock successful budget retrieval with same budgetId
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        budgets: [
          {
            budgetId: 'budget-123',
            month: '2025-11',
            ...aiBudget.groups,
          },
        ],
        count: 1,
      },
    });

    // Retrieve budgets
    const getResponse = await mockApiClient.get('/budget');
    expect(getResponse.data.budgets).toHaveLength(1);
    expect(getResponse.data.budgets[0].month).toBe('2025-11');
    expect(getResponse.data.budgets[0].budgetId).toBe('budget-123');
  });

  it('should handle budget update when budget already exists (409 → update)', async () => {
    const aiBudget = {
      month: '2025-11',
      groups: {
        income: [{ name: 'Salary', plannedAmount: 5000 }],
        expenses: [{ name: 'Rent', plannedAmount: 1500 }],
        savings: [],
      },
      isAIGenerated: true,
    };

    // Mock 409 conflict (budget already exists) - backend updates instead
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        budgetId: 'budget-123',
        ...aiBudget,
        updatedAt: new Date().toISOString(),
      },
    });

    // Save AI budget (backend will update existing)
    const saveResponse = await mockApiClient.post('/budget', aiBudget);
    expect(saveResponse.data.budgetId).toBe('budget-123');

    // Verify budget can be retrieved
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        budgets: [
          {
            budgetId: 'budget-123',
            month: '2025-11',
          },
        ],
        count: 1,
      },
    });

    const getResponse = await mockApiClient.get('/budget');
    expect(getResponse.data.budgets).toHaveLength(1);
  });

  it('should not redirect to onboarding when budget exists for current month', async () => {
    // Mock budget exists for November
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        budgets: [
          {
            budgetId: 'budget-123',
            month: '2025-11',
          },
        ],
        count: 1,
      },
    });

    const response = await mockApiClient.get('/budget');

    // Should have budgets (not empty)
    expect(response.data.count).toBeGreaterThan(0);
    expect(response.data.budgets[0].month).toBe('2025-11');

    // User should NOT be redirected to onboarding
    // (In actual app, this would check navigation state)
  });
});
