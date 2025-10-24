/**
 * BudgetBuddy AI Budget Generation Lambda Function
 * 
 * Handles AI-powered budget generation using AWS Bedrock with Claude 3.5 Sonnet.
 * Creates personalized budgets based on user onboarding data, regional cost of
 * living information, and family composition. Provides fallback to pre-seeded
 * data when AI service is unavailable.
 * 
 * Supported operations:
 * - AI budget generation from onboarding data
 * - Regional budget customization
 * - Cost of living data integration
 * - Financial insights generation
 * - Budget recommendation explanations
 */

const {
    BedrockRuntimeClient,
    InvokeModelCommand
} = require('@aws-sdk/client-bedrock-runtime');
const {
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    generateId,
    dynamoHelpers,
    logger
} = require('/opt/nodejs/utils');

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Main Lambda handler function
 * Routes AI-related requests to appropriate handler functions
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('AI request received', {
        correlationId,
        httpMethod: event.httpMethod,
        path: event.path,
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        // Route requests to appropriate handlers
        switch (`${httpMethod} ${path}`) {
            case 'GET /health':
            case 'GET /ai/health':
                return successResponse({
                    status: 'healthy',
                    service: 'ai',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                });

            case 'POST /budget/ai-generate':
                return await handleGenerateAIBudget(event, correlationId);

            case 'POST /ai/insights':
                return await handleGenerateInsights(event, correlationId);

            case 'POST /ai/recommendations':
                return await handleGenerateRecommendations(event, correlationId);

            default:
                logger.warn('Unsupported route', {
                    correlationId,
                    httpMethod,
                    path
                });
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in AI handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

/**
 * Handle AI budget generation
 * Creates a personalized budget using AWS Bedrock based on user data
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} AI budget generation response
 */
async function handleGenerateAIBudget(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            onboardingData
        } = body;

        if (!onboardingData) {
            return errorResponse.badRequest('Onboarding data is required for AI budget generation');
        }

        logger.info('AI budget generation request', {
            correlationId,
            userId: user.userId,
            location: onboardingData.location ? .city
        });

        // Get cost of living data for the user's location
        const costOfLivingData = await getCostOfLivingData(onboardingData.location);

        // Generate budget using AI
        let aiGeneratedBudget;
        try {
            aiGeneratedBudget = await generateBudgetWithAI(onboardingData, costOfLivingData, correlationId);
        } catch (aiError) {
            logger.warn('AI generation failed, falling back to template', {
                correlationId,
                error: aiError.message
            });
            // Fallback to template-based budget generation
            aiGeneratedBudget = generateTemplateBudget(onboardingData, costOfLivingData);
        }

        // Add metadata
        const budget = {
            ...aiGeneratedBudget,
            budgetId: generateId.budget(),
            familyId: user.familyId || user.userId,
            month: getCurrentMonth(),
            isAIGenerated: true,
            generatedAt: new Date().toISOString(),
            generationMethod: aiGeneratedBudget.generationMethod || 'ai',
        };

        // Calculate totals
        const calculatedBudget = calculateBudgetTotals(budget);

        logger.info('AI budget generated successfully', {
            correlationId,
            budgetId: budget.budgetId,
            totalIncome: calculatedBudget.totalIncome,
            generationMethod: budget.generationMethod
        });

        return successResponse(calculatedBudget, 'AI budget generated successfully');

    } catch (error) {
        logger.error('AI budget generation error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to generate AI budget');
    }
}

/**
 * Handle generate financial insights
 * Provides AI-powered insights about spending patterns and recommendations
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Financial insights response
 */
async function handleGenerateInsights(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            budgetData,
            transactionData
        } = body;

        logger.info('Generate insights request', {
            correlationId,
            userId: user.userId
        });

        // TODO: Implement AI-powered insights generation
        // This would analyze spending patterns and provide recommendations

        const placeholderInsights = {
            insights: [{
                    type: 'spending_pattern',
                    title: 'Dining Out Trend',
                    description: 'Your dining expenses have increased by 15% this month compared to your budget.',
                    severity: 'medium',
                    recommendation: 'Consider meal planning to reduce dining out expenses.',
                },
                {
                    type: 'savings_opportunity',
                    title: 'Emergency Fund Goal',
                    description: 'You\'re 60% towards your emergency fund goal of $5,000.',
                    severity: 'low',
                    recommendation: 'Great progress! Consider increasing your monthly savings by $100 to reach your goal faster.',
                },
            ],
            generatedAt: new Date().toISOString(),
        };

        return successResponse(placeholderInsights, 'Financial insights generated successfully');

    } catch (error) {
        logger.error('Generate insights error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to generate insights');
    }
}

/**
 * Handle generate recommendations
 * Provides personalized financial recommendations based on user data
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Recommendations response
 */
async function handleGenerateRecommendations(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);

        logger.info('Generate recommendations request', {
            correlationId,
            userId: user.userId
        });

        // TODO: Implement AI-powered recommendations
        const placeholderRecommendations = {
            recommendations: [{
                    category: 'budgeting',
                    title: 'Optimize Your Grocery Budget',
                    description: 'Based on your family size and location, you could save $150/month by meal planning and shopping at discount stores.',
                    priority: 'high',
                    estimatedSavings: 150,
                },
                {
                    category: 'savings',
                    title: 'Increase Emergency Fund',
                    description: 'Consider increasing your emergency fund contribution to reach 6 months of expenses.',
                    priority: 'medium',
                    estimatedSavings: 0,
                },
            ],
            generatedAt: new Date().toISOString(),
        };

        return successResponse(placeholderRecommendations, 'Recommendations generated successfully');

    } catch (error) {
        logger.error('Generate recommendations error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to generate recommendations');
    }
}

/**
 * Generate budget using AWS Bedrock AI
 * @param {Object} onboardingData - User onboarding information
 * @param {Object} costOfLivingData - Regional cost data
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} AI-generated budget
 */
async function generateBudgetWithAI(onboardingData, costOfLivingData, correlationId) {
    try {
        // Construct prompt for Claude 3.5 Sonnet
        const prompt = buildBudgetGenerationPrompt(onboardingData, costOfLivingData);

        const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

        const command = new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 4000,
                temperature: 0.3, // Lower temperature for more consistent financial advice
                messages: [{
                    role: 'user',
                    content: prompt,
                }, ],
            }),
        });

        logger.info('Invoking Bedrock AI model', {
            correlationId,
            modelId
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Parse AI response
        const aiResponse = responseBody.content[0].text;
        const budget = parseAIBudgetResponse(aiResponse);

        budget.generationMethod = 'ai';
        budget.aiExplanation = extractExplanation(aiResponse);

        return budget;

    } catch (error) {
        logger.error('Bedrock AI generation failed', error, {
            correlationId
        });
        throw new Error('AI budget generation failed');
    }
}

/**
 * Build prompt for AI budget generation
 * @param {Object} onboardingData - User data
 * @param {Object} costOfLivingData - Regional cost data
 * @returns {string} Formatted prompt
 */
function buildBudgetGenerationPrompt(onboardingData, costOfLivingData) {
    const {
        location,
        familyStatus,
        adults,
        children,
        housing,
        transportation,
        lifestyle,
        income
    } = onboardingData;

    return `You are a financial advisor creating a personalized zero-based budget. Generate a detailed monthly budget based on this information:

FAMILY INFORMATION:
- Location: ${location.city}, ${location.province}, ${location.country}
- Family Status: ${familyStatus}
- Adults: ${adults}
- Children: ${children?.length || 0} (ages: ${children?.map(c => c.age).join(', ') || 'none'})
- Housing: ${housing.type} - $${housing.monthlyPayment}/month
- Transportation: ${transportation.join(', ')}
- Lifestyle: ${lifestyle.shoppingPreference} shopping, ${lifestyle.diningOut} dining out, ${lifestyle.entertainment} entertainment
- Income Range: ${income.range} (${income.frequency})

REGIONAL DATA (${location.city}):
- Median Income: $${costOfLivingData?.medianIncome || 4500}/month
- Average Rent (2BR): $${costOfLivingData?.medianRent2Bed || 1500}/month
- Average Groceries (Family of 4): $${costOfLivingData?.avgGroceriesFamily4 || 1000}/month
- Average Utilities: $${costOfLivingData?.avgUtilities || 150}/month
- Average Transportation: $${costOfLivingData?.avgTransportation || 500}/month

REQUIREMENTS:
1. Create a zero-based budget where Income - Savings - Expenses = 0
2. Include region-specific categories (${location.country === 'Canada' ? 'RRSP, TFSA, RESP' : '401k, IRA, HSA'})
3. Adjust amounts based on family size and lifestyle preferences
4. Provide realistic amounts based on regional cost of living
5. Include emergency fund as priority savings

FORMAT YOUR RESPONSE AS JSON:
{
  "groups": {
    "income": [
      {
        "groupName": "Income",
        "categories": [
          {"name": "Primary Income", "plannedAmount": 0, "icon": "💼", "colorCode": "#4CAF50"},
          {"name": "Secondary Income", "plannedAmount": 0, "icon": "💻", "colorCode": "#2196F3"}
        ]
      }
    ],
    "savings": [
      {
        "groupName": "Savings & Investments", 
        "categories": [
          {"name": "Emergency Fund", "plannedAmount": 0, "icon": "🛡️", "colorCode": "#F44336"},
          {"name": "${location.country === 'Canada' ? 'RRSP' : '401(k)'}", "plannedAmount": 0, "icon": "🏦", "colorCode": "#3F51B5"}
        ]
      }
    ],
    "expenses": [
      {
        "groupName": "Housing",
        "categories": [
          {"name": "Rent/Mortgage", "plannedAmount": ${housing.monthlyPayment}, "icon": "🏠", "colorCode": "#FF5722"}
        ]
      }
    ]
  },
  "explanation": "Brief explanation of budget rationale and key recommendations"
}

Generate a complete, realistic budget with all necessary categories for this family.`;
}

/**
 * Parse AI response into budget structure
 * @param {string} aiResponse - Raw AI response
 * @returns {Object} Parsed budget object
 */
function parseAIBudgetResponse(aiResponse) {
    try {
        // Extract JSON from AI response (it might include explanation text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }

        const parsedResponse = JSON.parse(jsonMatch[0]);
        return parsedResponse;

    } catch (error) {
        logger.error('Failed to parse AI response', error);
        throw new Error('Invalid AI response format');
    }
}

/**
 * Extract explanation from AI response
 * @param {string} aiResponse - Raw AI response
 * @returns {string} Explanation text
 */
function extractExplanation(aiResponse) {
    try {
        const parsed = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]);
        return parsed.explanation || 'AI-generated budget based on your family profile and regional data.';
    } catch (error) {
        return 'AI-generated budget based on your family profile and regional data.';
    }
}

/**
 * Generate template-based budget as fallback
 * @param {Object} onboardingData - User data
 * @param {Object} costOfLivingData - Regional cost data
 * @returns {Object} Template budget
 */
function generateTemplateBudget(onboardingData, costOfLivingData) {
    const {
        location,
        housing,
        adults,
        children
    } = onboardingData;
    const isCanada = location.country === 'Canada';

    // Estimate income based on regional median
    const estimatedIncome = costOfLivingData ? .medianIncome || 4500;

    // Basic template budget structure
    const budget = {
        groups: {
            income: [{
                groupName: 'Income',
                categories: [{
                    name: 'Primary Income',
                    plannedAmount: estimatedIncome,
                    icon: '💼',
                    colorCode: '#4CAF50'
                }, ],
            }, ],
            savings: [{
                groupName: 'Savings & Investments',
                categories: [{
                        name: 'Emergency Fund',
                        plannedAmount: Math.round(estimatedIncome * 0.1),
                        icon: '🛡️',
                        colorCode: '#F44336'
                    },
                    {
                        name: isCanada ? 'RRSP' : '401(k)',
                        plannedAmount: Math.round(estimatedIncome * 0.1),
                        icon: '🏦',
                        colorCode: '#3F51B5'
                    },
                ],
            }, ],
            expenses: [{
                    groupName: 'Housing',
                    categories: [{
                            name: 'Rent/Mortgage',
                            plannedAmount: housing.monthlyPayment,
                            icon: '🏠',
                            colorCode: '#FF5722'
                        },
                        {
                            name: 'Utilities',
                            plannedAmount: costOfLivingData ? .avgUtilities || 150,
                            icon: '⚡',
                            colorCode: '#FFEB3B'
                        },
                    ],
                },
                {
                    groupName: 'Food',
                    categories: [{
                            name: 'Groceries',
                            plannedAmount: Math.round((costOfLivingData ? .avgGroceriesFamily4 || 1000) * (adults + children.length) / 4),
                            icon: '🛒',
                            colorCode: '#4CAF50'
                        },
                        {
                            name: 'Dining Out',
                            plannedAmount: 200,
                            icon: '🍽️',
                            colorCode: '#FF5722'
                        },
                    ],
                },
                {
                    groupName: 'Transportation',
                    categories: [{
                        name: 'Transportation',
                        plannedAmount: costOfLivingData ? .avgTransportation || 500,
                        icon: '🚗',
                        colorCode: '#2196F3'
                    }, ],
                },
            ],
        },
        generationMethod: 'template',
        explanation: 'Template budget generated based on regional averages and family size.',
    };

    return budget;
}

/**
 * Get cost of living data for a location
 * @param {Object} location - Location object
 * @returns {Promise<Object|null>} Cost of living data
 */
async function getCostOfLivingData(location) {
    try {
        const costData = await dynamoHelpers.getItem(
            `LOCATION#${location.country}`,
            `CITY#${location.city}#${location.province}`
        );

        return costData;
    } catch (error) {
        logger.warn('Failed to get cost of living data', {
            error: error.message,
            location
        });
        return null;
    }
}

/**
 * Get current month in YYYY-MM format
 * @returns {string} Current month
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate budget totals
 * @param {Object} budget - Budget object
 * @returns {Object} Budget with calculated totals
 */
function calculateBudgetTotals(budget) {
    const groups = budget.groups || {
        income: [],
        savings: [],
        expenses: []
    };

    const totalIncome = calculateGroupTotal(groups.income || []);
    const totalSavings = calculateGroupTotal(groups.savings || []);
    const totalExpenses = calculateGroupTotal(groups.expenses || []);

    const remainingBalance = totalIncome - totalSavings - totalExpenses;

    return {
        ...budget,
        totalIncome,
        totalSavings,
        totalExpenses,
        remainingBalance,
    };
}

/**
 * Calculate total for a budget group
 * @param {Array} groups - Array of budget groups
 * @returns {number} Total planned amount
 */
function calculateGroupTotal(groups) {
    return groups.reduce((groupTotal, group) => {
        const categoryTotal = group.categories.reduce((catTotal, category) => {
            return catTotal + (category.plannedAmount || 0);
        }, 0);
        return groupTotal + categoryTotal;
    }, 0);
}