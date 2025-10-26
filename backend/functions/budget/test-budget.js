/**
 * Simple test script for budget CRUD operations
 * Tests the budget endpoints without authentication for development
 */

const API_BASE_URL = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

async function testBudgetEndpoints() {
    console.log('🧪 Testing Budget CRUD Operations');
    console.log('=================================');

    // Test 1: Health Check
    console.log('\n1. Testing Health Check...');
    try {
        const response = await fetch(`${API_BASE_URL}/budget/health`);
        const data = await response.json();
        console.log('✅ Health Check:', data.message);
    } catch (error) {
        console.log('❌ Health Check failed:', error.message);
    }

    // Test 2: Create Budget (will fail without auth, but tests routing)
    console.log('\n2. Testing Create Budget (expect auth error)...');
    try {
        const response = await fetch(`${API_BASE_URL}/budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                month: '2025-11',
                groups: {
                    income: [],
                    savings: [],
                    expenses: []
                }
            })
        });
        const data = await response.json();
        console.log('Response:', data.message);

        if (response.status === 401) {
            console.log('✅ Authentication required (expected)');
        } else {
            console.log('❌ Unexpected response status:', response.status);
        }
    } catch (error) {
        console.log('❌ Create Budget test failed:', error.message);
    }

    // Test 3: Get Budgets (will fail without auth, but tests routing)
    console.log('\n3. Testing Get Budgets (expect auth error)...');
    try {
        const response = await fetch(`${API_BASE_URL}/budget`);
        const data = await response.json();
        console.log('Response:', data.message);

        if (response.status === 401) {
            console.log('✅ Authentication required (expected)');
        } else {
            console.log('❌ Unexpected response status:', response.status);
        }
    } catch (error) {
        console.log('❌ Get Budgets test failed:', error.message);
    }

    console.log('\n🎉 Budget endpoint testing completed!');
    console.log('\nNext steps:');
    console.log('- Implement frontend budget components');
    console.log('- Test with authenticated requests');
    console.log('- Add budget dashboard visualization');
}

// Run tests if this file is executed directly
if (require.main === module) {
    testBudgetEndpoints().catch(console.error);
}

module.exports = {
    testBudgetEndpoints
};