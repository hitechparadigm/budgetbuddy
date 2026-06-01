/**
 * Family Lambda Function — DEPRECATED
 *
 * This Lambda is deprecated. All family/budget collaboration is now handled
 * by the /budgets/* endpoints (budgets Lambda).
 *
 * Returns 410 Gone for all requests except OPTIONS (CORS preflight) and
 * the legacy health check endpoint.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://d1ueeugn9zcx7n.cloudfront.net',
  'https://d2ubhx2a13s7gc.cloudfront.net',
  'https://app.budgetbuddy.com',
];

function getCorsHeaders(event) {
  const origin = event?.headers?.Origin || event?.headers?.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

/**
 * Lambda handler — returns 410 Gone for all non-preflight requests.
 */
exports.handler = async (event) => {
  try {
    console.log(JSON.stringify({ level: 'info', message: 'Family Lambda invoked (deprecated)', httpMethod: event.httpMethod, path: event.path }));

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: '',
      };
    }

    // Legacy health check — kept for monitoring compatibility
    if (
      event.httpMethod === 'GET' &&
      (event.path === '/family/health' || event.path === '/v1/family/health')
    ) {
      return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ status: 'healthy', service: 'family', deprecated: true }),
      };
    }

    // All other requests: 410 Gone
    return {
      statusCode: 410,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: 'Gone',
        message: 'The /family/* API has been replaced by /budgets/*. Please update your client.',
      }),
    };
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'Family Lambda error', error: error.message }));
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
