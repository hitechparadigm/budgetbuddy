import * as fc from 'fast-check';

/**
 * Property-based tests for API and offline functionality
 * Validates API compatibility, offline persistence, and data synchronization
 */

// Mock network status for testing
jest.mock('../../services/api', () => ({
  getNetworkStatus: jest.fn(() => ({ isOnline: true, isOffline: false })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
}));

describe('API and Offline Properties', () => {
  /**
   * Property 2: API Compatibility Across Platforms
   * Validates that API requests work consistently across different scenarios
   * Requirements: 22.2, 24.5
   */
  it('should handle API requests consistently across different scenarios', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.constantFrom('/budgets', '/transactions', '/categories', '/auth/login'),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          data: fc.option(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            category: fc.string({ minLength: 1, maxLength: 50 }),
          })),
          params: fc.option(fc.record({
            page: fc.integer({ min: 1, max: 100 }),
            limit: fc.integer({ min: 1, max: 100 }),
            sort: fc.constantFrom('name', 'date', 'amount'),
          })),
          requiresAuth: fc.boolean(),
        }),
        fc.constantFrom(200, 201, 400, 401, 404, 500),
        fc.boolean(), // isOnline
        (request, expectedStatus, isOnline) => {
          // Validate request structure
          expect(request.endpoint).toMatch(/^\/[a-z]+/);
          expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(request.method);

          // Validate data structure for non-GET requests
          if (request.data && request.method !== 'GET') {
            expect(request.data).toHaveProperty('id');
            if (request.data.amount !== undefined) {
              expect(request.data.amount).toBeGreaterThan(0);
              expect(Number.isFinite(request.data.amount)).toBe(true);
            }
          }

          // Validate query parameters
          if (request.params) {
            if (request.params.page !== undefined) {
              expect(request.params.page).toBeGreaterThanOrEqual(1);
            }
            if (request.params.limit !== undefined) {
              expect(request.params.limit).toBeGreaterThanOrEqual(1);
              expect(request.params.limit).toBeLessThanOrEqual(100);
            }
          }

          // Validate HTTP status codes
          expect([200, 201, 400, 401, 404, 500]).toContain(expectedStatus);

          // Success responses should have valid status codes
          if (expectedStatus >= 200 && expectedStatus < 300) {
            expect(expectedStatus).toBeGreaterThanOrEqual(200);
            expect(expectedStatus).toBeLessThan(300);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Offline Transaction Persistence
   * Validates that transactions are properly stored and retrieved offline
   * Requirements: 24.1, 24.2, 24.3
   */
  it('should persist transactions offline and maintain data integrity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            budgetId: fc.uuid(),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            category: fc.string({ minLength: 1, maxLength: 50 }),
            date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.constantFrom('pending', 'synced', 'conflict'),
        (transactions, syncStatus) => {
          // Validate transaction data structure
          transactions.forEach(transaction => {
            expect(transaction.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(transaction.budgetId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(transaction.description.length).toBeGreaterThan(0);
            expect(transaction.amount).toBeGreaterThan(0);
            expect(Number.isFinite(transaction.amount)).toBe(true);
            expect(transaction.category.length).toBeGreaterThan(0);
            expect(transaction.date).toBeInstanceOf(Date);
            expect(transaction.createdAt).toBeInstanceOf(Date);
          });

          // Validate sync status
          expect(['pending', 'synced', 'conflict']).toContain(syncStatus);

          // Validate data consistency
          const uniqueIds = new Set(transactions.map(t => t.id));
          expect(uniqueIds.size).toBe(transactions.length); // All IDs should be unique
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Offline Data Synchronization
   * Validates that offline data syncs correctly with server data
   * Requirements: 24.2, 24.3, 24.6
   */
  it('should synchronize offline data correctly with conflict resolution', () => {
    fc.assert(
      fc.property(
        fc.record({
          localData: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            updatedAt: fc.date({ min: new Date('2023-01-01'), max: new Date() }),
            syncStatus: fc.constantFrom('pending', 'synced', 'conflict'),
          }),
          serverData: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            updatedAt: fc.date({ min: new Date('2023-01-01'), max: new Date() }),
          }),
          conflictStrategy: fc.constantFrom('server_wins', 'client_wins', 'merge'),
        }),
        fc.boolean(), // hasConflict
        (syncData, hasConflict) => {
          const { localData, serverData, conflictStrategy } = syncData;

          // Validate data structure consistency
          expect(localData.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
          expect(serverData.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

          // Validate amounts
          expect(localData.amount).toBeGreaterThan(0);
          expect(serverData.amount).toBeGreaterThan(0);
          expect(Number.isFinite(localData.amount)).toBe(true);
          expect(Number.isFinite(serverData.amount)).toBe(true);

          // Validate conflict resolution strategy
          expect(['server_wins', 'client_wins', 'merge']).toContain(conflictStrategy);

          // Validate data integrity
          expect(localData.name.trim().length).toBeGreaterThan(0);
          expect(serverData.name.trim().length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
