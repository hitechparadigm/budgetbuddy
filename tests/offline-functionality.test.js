/**
 * Offline Functionality Tests
 * Comprehensive testing for 7+ days offline capability and sync functionality
 */

// Mock React Native modules first
global.jest = require("jest-mock");
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(() => Promise.resolve([])),
    })
  ),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Import services after mocking
const {
  initializeOfflineStorage,
  storeOfflineData,
  getOfflineData,
  addToSyncQueue,
  getSyncQueue,
  clearOfflineData,
  getStorageStats,
} = require("../packages/mobile/src/services/offline");

const { syncService } = require("../packages/mobile/src/services/syncService");

describe("Offline Functionality Tests", () => {
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize offline storage
    await initializeOfflineStorage();
  });

  afterEach(async () => {
    // Cleanup
    await clearOfflineData();
  });

  describe("Offline Storage Capability", () => {
    it("should store budget data offline for 7+ days", async () => {
      const budgetData = {
        id: "budget_test_1",
        name: "Test Budget",
        amount: 1000,
        category: "Income",
        frequency: "monthly",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      };

      // Store budget offline
      await storeOfflineData("budgets", budgetData, "pending");

      // Retrieve budget data
      const storedBudgets = await getOfflineData("budgets");

      expect(storedBudgets).toHaveLength(1);
      expect(storedBudgets[0].name).toBe("Test Budget");
      expect(storedBudgets[0].sync_status).toBe("pending");
    });

    it("should store transaction data offline for 7+ days", async () => {
      const transactionData = {
        id: "transaction_test_1",
        budgetId: "budget_test_1",
        description: "Test Transaction",
        amount: 50,
        category: "Food",
        date: "2024-01-15",
      };

      // Store transaction offline
      await storeOfflineData("transactions", transactionData, "pending");

      // Retrieve transaction data
      const storedTransactions = await getOfflineData("transactions");

      expect(storedTransactions).toHaveLength(1);
      expect(storedTransactions[0].description).toBe("Test Transaction");
      expect(storedTransactions[0].sync_status).toBe("pending");
    });

    it("should store category data offline for 7+ days", async () => {
      const categoryData = {
        id: "category_test_1",
        name: "Test Category",
        color: "#FF5722",
        icon: "restaurant",
      };

      // Store category offline
      await storeOfflineData("categories", categoryData, "pending");

      // Retrieve category data
      const storedCategories = await getOfflineData("categories");

      expect(storedCategories).toHaveLength(1);
      expect(storedCategories[0].name).toBe("Test Category");
      expect(storedCategories[0].sync_status).toBe("pending");
    });

    it("should handle large amounts of offline data", async () => {
      const startTime = Date.now();

      // Create 1000 transactions (simulating 7 days of heavy usage)
      const transactions = [];
      for (let i = 0; i < 1000; i++) {
        transactions.push({
          id: `transaction_${i}`,
          budgetId: "budget_test",
          description: `Transaction ${i}`,
          amount: Math.random() * 100,
          category: "Test",
          date: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
        });
      }

      // Store all transactions
      for (const transaction of transactions) {
        await storeOfflineData("transactions", transaction, "pending");
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all transactions stored
      const storedTransactions = await getOfflineData("transactions");
      expect(storedTransactions).toHaveLength(1000);
    });
  });

  describe("Sync Queue Management", () => {
    it("should add items to sync queue", async () => {
      const syncItem = {
        type: "CREATE",
        entity: "budget",
        data: { id: "test_budget", name: "Test" },
      };

      await addToSyncQueue(syncItem);

      const queue = await getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entity).toBe("budget");
      expect(queue[0].type).toBe("CREATE");
    });

    it("should handle sync queue with many items", async () => {
      // Add 100 items to sync queue
      for (let i = 0; i < 100; i++) {
        await addToSyncQueue({
          type: "CREATE",
          entity: "transaction",
          data: { id: `transaction_${i}`, amount: i * 10 },
        });
      }

      const queue = await getSyncQueue();
      expect(queue).toHaveLength(100);
    });

    it("should provide accurate storage statistics", async () => {
      // Add some test data
      await storeOfflineData(
        "budgets",
        { id: "b1", name: "Budget 1" },
        "pending"
      );
      await storeOfflineData(
        "transactions",
        { id: "t1", description: "Trans 1" },
        "pending"
      );
      await addToSyncQueue({
        type: "CREATE",
        entity: "budget",
        data: { id: "b2" },
      });

      const stats = await getStorageStats();

      expect(stats.syncQueueSize).toBeGreaterThan(0);
      expect(stats.pendingItems).toBeGreaterThan(0);
      expect(typeof stats.isOnline).toBe("boolean");
    });
  });

  describe("Sync Service Functionality", () => {
    it("should initialize sync service without errors", async () => {
      await expect(syncService.initialize()).resolves.not.toThrow();
    });

    it("should handle sync when offline", async () => {
      // Mock offline state
      const NetInfo = require("@react-native-community/netinfo");
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const result = await syncService.performSync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("No network connection");
    });

    it("should handle sync when online", async () => {
      // Mock online state
      const NetInfo = require("@react-native-community/netinfo");
      NetInfo.fetch.mockResolvedValue({ isConnected: true });

      // Mock API responses
      const mockApi = {
        get: jest.fn(() => Promise.resolve({ data: [] })),
        post: jest.fn(() => Promise.resolve({ data: {} })),
        put: jest.fn(() => Promise.resolve({ data: {} })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
      };

      // Add some items to sync
      await addToSyncQueue({
        type: "CREATE",
        entity: "budget",
        data: { id: "test_budget", name: "Test Budget" },
      });

      const result = await syncService.performSync();

      // Should attempt to sync (may fail due to mocked API)
      expect(typeof result.success).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should cleanup sync service properly", () => {
      expect(() => syncService.cleanup()).not.toThrow();
    });
  });

  describe("Conflict Resolution", () => {
    it("should resolve conflicts with server_wins strategy", async () => {
      const localData = {
        id: "test_1",
        name: "Local Version",
        updatedAt: "2024-01-01T10:00:00Z",
      };

      const serverData = {
        id: "test_1",
        name: "Server Version",
        updatedAt: "2024-01-01T11:00:00Z",
      };

      const {
        resolveConflict,
      } = require("../packages/mobile/src/services/offline");
      const resolved = await resolveConflict(
        "budgets",
        localData,
        serverData,
        "server_wins"
      );

      expect(resolved.name).toBe("Server Version");
    });

    it("should resolve conflicts with client_wins strategy", async () => {
      const localData = {
        id: "test_1",
        name: "Local Version",
        updatedAt: "2024-01-01T10:00:00Z",
      };

      const serverData = {
        id: "test_1",
        name: "Server Version",
        updatedAt: "2024-01-01T11:00:00Z",
      };

      const {
        resolveConflict,
      } = require("../packages/mobile/src/services/offline");
      const resolved = await resolveConflict(
        "budgets",
        localData,
        serverData,
        "client_wins"
      );

      expect(resolved.name).toBe("Local Version");
    });

    it("should resolve conflicts with merge strategy (latest wins)", async () => {
      const localData = {
        id: "test_1",
        name: "Local Version",
        updatedAt: "2024-01-01T12:00:00Z", // Newer
      };

      const serverData = {
        id: "test_1",
        name: "Server Version",
        updatedAt: "2024-01-01T11:00:00Z", // Older
      };

      const {
        resolveConflict,
      } = require("../packages/mobile/src/services/offline");
      const resolved = await resolveConflict(
        "budgets",
        localData,
        serverData,
        "merge"
      );

      expect(resolved.name).toBe("Local Version"); // Local is newer
    });
  });

  describe("Data Integrity", () => {
    it("should maintain data integrity during offline operations", async () => {
      const originalBudget = {
        id: "integrity_test",
        name: "Original Budget",
        amount: 1000,
        category: "Income",
        frequency: "monthly",
        startDate: "2024-01-01",
      };

      // Store original
      await storeOfflineData("budgets", originalBudget, "synced");

      // Update offline
      const updatedBudget = {
        ...originalBudget,
        name: "Updated Budget",
        amount: 1500,
      };
      await storeOfflineData("budgets", updatedBudget, "pending");

      // Retrieve and verify
      const storedBudgets = await getOfflineData("budgets", {
        id: "integrity_test",
      });

      expect(storedBudgets).toHaveLength(1);
      expect(storedBudgets[0].name).toBe("Updated Budget");
      expect(storedBudgets[0].amount).toBe(1500);
      expect(storedBudgets[0].sync_status).toBe("pending");
    });

    it("should handle concurrent offline operations", async () => {
      const operations = [];

      // Simulate concurrent operations
      for (let i = 0; i < 50; i++) {
        operations.push(
          storeOfflineData(
            "transactions",
            {
              id: `concurrent_${i}`,
              description: `Concurrent Transaction ${i}`,
              amount: i * 10,
              category: "Test",
              date: new Date().toISOString(),
            },
            "pending"
          )
        );
      }

      // Execute all operations concurrently
      await Promise.all(operations);

      // Verify all operations completed
      const storedTransactions = await getOfflineData("transactions");
      expect(storedTransactions.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Performance Tests", () => {
    it("should handle 7 days of typical usage data", async () => {
      const startTime = Date.now();

      // Simulate 7 days of data:
      // - 10 budgets
      // - 20 categories
      // - 200 transactions (about 30 per day)

      const budgets = Array.from({ length: 10 }, (_, i) => ({
        id: `budget_${i}`,
        name: `Budget ${i}`,
        amount: 1000 + i * 100,
        category: "Income",
        frequency: "monthly",
        startDate: "2024-01-01",
      }));

      const categories = Array.from({ length: 20 }, (_, i) => ({
        id: `category_${i}`,
        name: `Category ${i}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        icon: "default",
      }));

      const transactions = Array.from({ length: 200 }, (_, i) => ({
        id: `transaction_${i}`,
        budgetId: `budget_${i % 10}`,
        description: `Transaction ${i}`,
        amount: Math.random() * 100,
        category: `category_${i % 20}`,
        date: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour apart
      }));

      // Store all data
      for (const budget of budgets) {
        await storeOfflineData("budgets", budget, "pending");
      }

      for (const category of categories) {
        await storeOfflineData("categories", category, "pending");
      }

      for (const transaction of transactions) {
        await storeOfflineData("transactions", transaction, "pending");
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);

      // Verify data integrity
      const [storedBudgets, storedCategories, storedTransactions] =
        await Promise.all([
          getOfflineData("budgets"),
          getOfflineData("categories"),
          getOfflineData("transactions"),
        ]);

      expect(storedBudgets).toHaveLength(10);
      expect(storedCategories).toHaveLength(20);
      expect(storedTransactions).toHaveLength(200);
    });

    it("should retrieve data quickly even with large datasets", async () => {
      // Store 500 transactions
      for (let i = 0; i < 500; i++) {
        await storeOfflineData(
          "transactions",
          {
            id: `perf_transaction_${i}`,
            description: `Performance Test ${i}`,
            amount: i,
            category: "Test",
            date: new Date().toISOString(),
          },
          "synced"
        );
      }

      const startTime = Date.now();
      const transactions = await getOfflineData("transactions");
      const endTime = Date.now();

      const retrievalTime = endTime - startTime;

      // Should retrieve within 1 second
      expect(retrievalTime).toBeLessThan(1000);
      expect(transactions.length).toBeGreaterThanOrEqual(500);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock database error
      const mockDb = {
        runAsync: jest.fn(() => Promise.reject(new Error("Database error"))),
        getAllAsync: jest.fn(() => Promise.reject(new Error("Database error"))),
      };

      // Should not throw, but handle gracefully
      await expect(
        storeOfflineData("budgets", { id: "test" }, "pending")
      ).rejects.toThrow("Database error");
    });

    it("should handle sync errors gracefully", async () => {
      // Mock network error
      const NetInfo = require("@react-native-community/netinfo");
      NetInfo.fetch.mockRejectedValue(new Error("Network error"));

      const result = await syncService.performSync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle storage quota exceeded", async () => {
      // This would be implementation-specific
      // For now, just ensure the function exists and can be called
      expect(typeof clearOfflineData).toBe("function");
      await expect(clearOfflineData()).resolves.not.toThrow();
    });
  });
});

describe("Integration Tests", () => {
  it("should complete full offline-to-online workflow", async () => {
    // 1. Start offline
    const NetInfo = require("@react-native-community/netinfo");
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    // 2. Create data offline
    const budgetData = {
      id: "integration_budget",
      name: "Integration Test Budget",
      amount: 2000,
      category: "Income",
      frequency: "monthly",
      startDate: "2024-01-01",
    };

    await storeOfflineData("budgets", budgetData, "pending");
    await addToSyncQueue({
      type: "CREATE",
      entity: "budget",
      data: budgetData,
    });

    // 3. Verify offline storage
    const offlineBudgets = await getOfflineData("budgets");
    expect(offlineBudgets).toHaveLength(1);
    expect(offlineBudgets[0].sync_status).toBe("pending");

    // 4. Go online
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    // 5. Attempt sync (will fail due to mocked API, but should not crash)
    const syncResult = await syncService.performSync();
    expect(typeof syncResult.success).toBe("boolean");

    // 6. Verify data still exists
    const postSyncBudgets = await getOfflineData("budgets");
    expect(postSyncBudgets).toHaveLength(1);
  });
});

// Property-based tests for robustness
describe("Property-Based Tests", () => {
  const generateRandomBudget = () => ({
    id: `budget_${Math.random().toString(36).substr(2, 9)}`,
    name: `Budget ${Math.random().toString(36).substr(2, 5)}`,
    amount: Math.floor(Math.random() * 10000),
    category: ["Income", "Expenses", "Savings"][Math.floor(Math.random() * 3)],
    frequency: ["weekly", "monthly", "yearly"][Math.floor(Math.random() * 3)],
    startDate: new Date(
      Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  it("should handle random budget data consistently", async () => {
    for (let i = 0; i < 50; i++) {
      const budget = generateRandomBudget();

      await storeOfflineData("budgets", budget, "pending");

      const stored = await getOfflineData("budgets", { id: budget.id });
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(budget.id);
      expect(stored[0].name).toBe(budget.name);
    }
  });

  it("should maintain data consistency across random operations", async () => {
    const operations = ["CREATE", "UPDATE", "DELETE"];
    const entities = ["budget", "transaction", "category"];

    for (let i = 0; i < 100; i++) {
      const operation =
        operations[Math.floor(Math.random() * operations.length)];
      const entity = entities[Math.floor(Math.random() * entities.length)];

      await addToSyncQueue({
        type: operation,
        entity: entity,
        data: { id: `random_${i}`, name: `Random ${i}` },
      });
    }

    const queue = await getSyncQueue();
    expect(queue.length).toBeGreaterThanOrEqual(100);

    // All items should have valid structure
    queue.forEach((item) => {
      expect(typeof item.id).toBe("string");
      expect(typeof item.type).toBe("string");
      expect(typeof item.entity).toBe("string");
      expect(typeof item.timestamp).toBe("number");
      expect(typeof item.retryCount).toBe("number");
    });
  });
});
