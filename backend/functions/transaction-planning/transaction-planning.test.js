/**
 * BudgetBuddy Transaction Planning Lambda Function Tests
 *
 * Comprehensive test suite for transaction planning operations including
 * recurring patterns, date calculations, and CRUD operations.
 */

const { handler } = require('./index');
const recurringService = require('./recurring-service');
const {
    PlanValidationError,
    RecurringPatternError,
    DateCalculationError
} = require('./errors');

// Mock the utils layer
jest.mock('/opt/nodejs/utils', () => ({
    successResponse: jest.fn((data, message) => ({
        statusCode: 200,
        body: JSON.stringify({ success: true, data, message })
    })),
    errorResponse: {
        badRequest: jest.fn((message) => ({
            statusCode: 400,
            body: JSON.stringify({ success: false, error: message })
        })),
        notFound: jest.fn((message) => ({
            statusCode: 404,
            body: JSON.stringify({ success: false, error: message })
        })),
        internalError: jest.fn((message) => ({
            statusCode: 500,
            body: JSON.stringify({ success: false, error: message })
        }))
    },
    parseRequestBody: jest.fn((body) => JSON.parse(body)),
    getUserFromEvent: jest.fn(() => ({
        userId: 'user_123',
        familyId: 'family_123',
        firstName: 'John',
        lastName: 'Doe'
    })),
    generateId: {
        plannedTransaction: jest.fn(() => 'plan_' + Date.now()),
        transaction: jest.fn(() => 'txn_' + Date.now())
    },
    dynamoHelpers: {
        putItem: jest.fn(),
        queryByPK: jest.fn(),
        getItem: jest.fn(),
        updateItem: jest.fn()
    },
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('Transaction Planning Lambda Handler', () => {
    const mockEvent = {
        httpMethod: 'POST',
        path: '/transaction-planning',
        body: JSON.stringify({
            type: 'expense',
            amount: 100,
            currency: 'CAD',
            categoryId: 'cat_groceries_001',
            categoryName: 'Groceries',
            date: '2025-11-15',
            time: '14:30',
            notes: 'Weekly grocery shopping',
            isRecurring: true,
            frequency: 'weekly'
        }),
        queryStringParameters: null,
        pathParameters: null
    };

    const mockContext = {
        awsRequestId: 'test-request-id'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Health Check', () => {
        test('should return healthy status', async () => {
            const event = {
                ...mockEvent,
                httpMethod: 'GET',
                path: '/transaction-planning/health'
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.data.status).toBe('healthy');
            expect(body.data.service).toBe('transaction-planning');
        });
    });

    describe('CORS Handling', () => {
        test('should handle OPTIONS request', async () => {
            const event = {
                ...mockEvent,
                httpMethod: 'OPTIONS'
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers['Access-Control-Allow-Methods']).toContain('POST');
        });
    });

    describe('Create Planned Transaction', () => {
        test('should create planned transaction successfully', async () => {
            const { dynamoHelpers } = require('/opt/nodejs/utils');
            dynamoHelpers.putItem.mockResolvedValue({});

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'PLANNED_TRANSACTION',
                    transactionType: 'expense',
                    amount: 100,
                    currency: 'CAD',
                    isRecurring: true,
                    frequency: 'weekly'
                })
            );
        });

        test('should validate required fields', async () => {
            const invalidEvent = {
                ...mockEvent,
                body: JSON.stringify({
                    type: 'expense'
                    // Missing required fields
                })
            };

            const result = await handler(invalidEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('required');
        });

        test('should validate transaction type', async () => {
            const invalidEvent = {
                ...mockEvent,
                body: JSON.stringify({
                    ...JSON.parse(mockEvent.body),
                    type: 'invalid_type'
                })
            };

            const result = await handler(invalidEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('Type must be either "income" or "expense"');
        });

        test('should validate currency', async () => {
            const invalidEvent = {
                ...mockEvent,
                body: JSON.stringify({
                    ...JSON.parse(mockEvent.body),
                    currency: 'EUR'
                })
            };

            const result = await handler(invalidEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('Currency must be either "CAD" or "USD"');
        });

        test('should validate positive amount', async () => {
            const invalidEvent = {
                ...mockEvent,
                body: JSON.stringify({
                    ...JSON.parse(mockEvent.body),
                    amount: -50
                })
            };

            const result = await handler(invalidEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('Amount must be positive');
        });
    });

    describe('Get Planned Transactions', () => {
        test('should retrieve planned transactions', async () => {
            const { dynamoHelpers } = require('/opt/nodejs/utils');
            const mockPlannedTransactions = [
                {
                    planId: 'plan_123',
                    familyId: 'family_123',
                    transactionType: 'expense',
                    amount: 100,
                    currency: 'CAD',
                    scheduledDate: '2025-11-15',
                    isRecurring: true,
                    frequency: 'weekly'
                }
            ];

            dynamoHelpers.queryByPK.mockResolvedValue(mockPlannedTransactions);

            const event = {
                ...mockEvent,
                httpMethod: 'GET',
                path: '/transaction-planning'
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.data.plannedTransactions).toHaveLength(1);
            expect(body.data.plannedTransactions[0].planId).toBe('plan_123');
        });

        test('should filter by transaction type', async () => {
            const { dynamoHelpers } = require('/opt/nodejs/utils');
            dynamoHelpers.queryByPK.mockResolvedValue([]);

            const event = {
                ...mockEvent,
                httpMethod: 'GET',
                path: '/transaction-planning',
                queryStringParameters: {
                    type: 'income'
                }
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(dynamoHelpers.queryByPK).toHaveBeenCalledWith(
                'FAMILY#family_123',
                expect.objectContaining({
                    FilterExpression: expect.stringContaining('transactionType = :type'),
                    ExpressionAttributeValues: expect.objectContaining({
                        ':type': 'income'
                    })
                })
            );
        });
    });

    describe('Execute Planned Transaction', () => {
        test('should execute planned transaction successfully', async () => {
            const { dynamoHelpers } = require('/opt/nodejs/utils');
            const mockPlannedTransaction = {
                PK: 'FAMILY#family_123',
                SK: 'PLANNED_TXN#2025-11-15#plan_123',
                planId: 'plan_123',
                transactionType: 'expense',
                amount: 100,
                categoryId: 'cat_groceries_001',
                scheduledDate: '2025-11-15',
                isExecuted: false,
                isRecurring: false
            };

            dynamoHelpers.queryByPK.mockResolvedValue([mockPlannedTransaction]);
            dynamoHelpers.putItem.mockResolvedValue({});
            dynamoHelpers.updateItem.mockResolvedValue({});

            const event = {
                ...mockEvent,
                httpMethod: 'POST',
                path: '/transaction-planning/execute',
                body: JSON.stringify({
                    planId: 'plan_123'
                })
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'TRANSACTION',
                    sourceType: 'PLANNED_TRANSACTION',
                    sourcePlanId: 'plan_123'
                })
            );
            expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
                mockPlannedTransaction.PK,
                mockPlannedTransaction.SK,
                expect.objectContaining({
                    isExecuted: true
                })
            );
        });

        test('should not execute already executed transaction', async () => {
            const { dynamoHelpers } = require('/opt/nodejs/utils');
            const mockPlannedTransaction = {
                planId: 'plan_123',
                isExecuted: true
            };

            dynamoHelpers.queryByPK.mockResolvedValue([mockPlannedTransaction]);

            const event = {
                ...mockEvent,
                httpMethod: 'POST',
                path: '/transaction-planning/execute',
                body: JSON.stringify({
                    planId: 'plan_123'
                })
            };

            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('already been executed');
        });
    });
});

describe('Recurring Service', () => {
    describe('validateRecurringPattern', () => {
        test('should validate valid weekly pattern', () => {
            const pattern = {
                frequency: 'weekly',
                startDate: '2025-11-01',
                endDate: '2025-12-01'
            };

            expect(() => recurringService.validateRecurringPattern(pattern)).not.toThrow();
        });

        test('should reject invalid frequency', () => {
            const pattern = {
                frequency: 'invalid',
                startDate: '2025-11-01'
            };

            expect(() => recurringService.validateRecurringPattern(pattern))
                .toThrow(RecurringPatternError);
        });

        test('should validate custom interval', () => {
            const pattern = {
                frequency: 'custom',
                customInterval: 2,
                startDate: '2025-11-01'
            };

            expect(() => recurringService.validateRecurringPattern(pattern)).not.toThrow();
        });

        test('should reject invalid custom interval', () => {
            const pattern = {
                frequency: 'custom',
                customInterval: 0,
                startDate: '2025-11-01'
            };

            expect(() => recurringService.validateRecurringPattern(pattern))
                .toThrow(RecurringPatternError);
        });

        test('should validate end date after start date', () => {
            const pattern = {
                frequency: 'monthly',
                startDate: '2025-11-01',
                endDate: '2025-10-01' // Before start date
            };

            expect(() => recurringService.validateRecurringPattern(pattern))
                .toThrow(RecurringPatternError);
        });
    });

    describe('calculateNextOccurrence', () => {
        test('should calculate weekly occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-01', 'weekly');
            expect(nextDate).toBe('2025-11-08');
        });

        test('should calculate bi-weekly occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-01', 'bi-weekly');
            expect(nextDate).toBe('2025-11-15');
        });

        test('should calculate monthly occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-01', 'monthly');
            expect(nextDate).toBe('2025-12-01');
        });

        test('should calculate monthly last day occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-30', 'monthly', null, true);
            expect(nextDate).toBe('2025-12-31');
        });

        test('should calculate annual occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-01', 'annually');
            expect(nextDate).toBe('2026-11-01');
        });

        test('should calculate custom interval occurrence', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-11-01', 'custom', 3);
            expect(nextDate).toBe('2026-02-01');
        });

        test('should handle leap year edge case', () => {
            const nextDate = recurringService.calculateNextOccurrence('2024-02-29', 'annually');
            expect(nextDate).toBe('2025-02-28'); // 2025 is not a leap year
        });

        test('should handle month-end edge cases', () => {
            const nextDate = recurringService.calculateNextOccurrence('2025-01-31', 'monthly');
            expect(nextDate).toBe('2025-02-28'); // February doesn't have 31 days
        });

        test('should throw error for invalid date', () => {
            expect(() => recurringService.calculateNextOccurrence('invalid-date', 'weekly'))
                .toThrow(DateCalculationError);
        });

        test('should throw error for unsupported frequency', () => {
            expect(() => recurringService.calculateNextOccurrence('2025-11-01', 'unsupported'))
                .toThrow(RecurringPatternError);
        });
    });

    describe('generateOccurrences', () => {
        test('should generate weekly occurrences', () => {
            const occurrences = recurringService.generateOccurrences(
                '2025-11-01',
                'weekly',
                null,
                false,
                '2025-11-30',
                10
            );

            expect(occurrences).toHaveLength(4); // 4 weeks in November
            expect(occurrences[0]).toBe('2025-11-08');
            expect(occurrences[1]).toBe('2025-11-15');
            expect(occurrences[2]).toBe('2025-11-22');
            expect(occurrences[3]).toBe('2025-11-29');
        });

        test('should generate monthly occurrences', () => {
            const occurrences = recurringService.generateOccurrences(
                '2025-01-15',
                'monthly',
                null,
                false,
                '2025-04-15',
                10
            );

            expect(occurrences).toHaveLength(3);
            expect(occurrences[0]).toBe('2025-02-15');
            expect(occurrences[1]).toBe('2025-03-15');
            expect(occurrences[2]).toBe('2025-04-15');
        });

        test('should respect end date', () => {
            const occurrences = recurringService.generateOccurrences(
                '2025-11-01',
                'weekly',
                null,
                false,
                '2025-11-15',
                10
            );

            expect(occurrences).toHaveLength(2);
            expect(occurrences[0]).toBe('2025-11-08');
            expect(occurrences[1]).toBe('2025-11-15');
        });

        test('should respect max occurrences limit', () => {
            const occurrences = recurringService.generateOccurrences(
                '2025-11-01',
                'weekly',
                null,
                false,
                null,
                3
            );

            expect(occurrences).toHaveLength(3);
        });
    });

    describe('hasRecurringEnded', () => {
        test('should return false for never-ending recurring', () => {
            const recurringTransaction = {
                endDate: null,
                frequency: 'weekly'
            };

            expect(recurringService.hasRecurringEnded(recurringTransaction)).toBe(false);
        });

        test('should return true for ended recurring', () => {
            const recurringTransaction = {
                endDate: '2025-01-01',
                frequency: 'weekly'
            };

            expect(recurringService.hasRecurringEnded(recurringTransaction, '2025-12-01')).toBe(true);
        });

        test('should return false for active recurring', () => {
            const recurringTransaction = {
                endDate: '2025-12-31',
                frequency: 'weekly'
            };

            expect(recurringService.hasRecurringEnded(recurringTransaction, '2025-11-01')).toBe(false);
        });
    });

    describe('getRecurringDescription', () => {
        test('should describe weekly pattern', () => {
            const description = recurringService.getRecurringDescription({
                frequency: 'weekly'
            });

            expect(description).toBe('Repeats every week indefinitely');
        });

        test('should describe monthly with end date', () => {
            const description = recurringService.getRecurringDescription({
                frequency: 'monthly',
                endDate: '2025-12-31'
            });

            expect(description).toContain('every month until');
        });

        test('should describe custom interval', () => {
            const description = recurringService.getRecurringDescription({
                frequency: 'custom',
                customInterval: 3
            });

            expect(description).toContain('every 3 months');
        });

        test('should describe last day of month', () => {
            const description = recurringService.getRecurringDescription({
                frequency: 'monthly',
                onLastDayOfMonth: true
            });

            expect(description).toContain('on the last day of every month');
        });
    });

    describe('validateScheduleDate', () => {
        test('should validate current date', () => {
            const today = new Date().toISOString().split('T')[0];
            expect(() => recurringService.validateScheduleDate(today)).not.toThrow();
        });

        test('should reject invalid date format', () => {
            expect(() => recurringService.validateScheduleDate('invalid-date'))
                .toThrow(DateCalculationError);
        });

        test('should reject date too far in past', () => {
            expect(() => recurringService.validateScheduleDate('2020-01-01'))
                .toThrow(DateCalculationError);
        });

        test('should reject date too far in future', () => {
            expect(() => recurringService.validateScheduleDate('2040-01-01'))
                .toThrow(DateCalculationError);
        });
    });
});
