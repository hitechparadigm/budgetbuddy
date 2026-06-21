const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = process.env.TABLE_NAME || "BudgetBuddyTable";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://d1ueeugn9zcx7n.cloudfront.net",
  "https://d2ubhx2a13s7gc.cloudfront.net",
  "https://app.budgetbuddy.com",
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
}

// Response helper
function response(statusCode, body, origin = "") {
  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(body),
  };
}

// Get user ID from authorizer context
function getUserId(event) {
  return event.requestContext?.authorizer?.claims?.sub;
}

// Get portfolio overview
async function getPortfolio(userId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "HOLDING#",
    },
  };

  const result = await dynamodb.query(params).promise();
  const holdings = result.Items || [];

  // Calculate portfolio summary
  let totalValue = 0;
  let totalCostBasis = 0;
  let totalDayChange = 0;
  const allocationMap = {};

  holdings.forEach((holding) => {
    const value = holding.shares * holding.currentPrice;
    const costBasis = holding.shares * holding.costBasis;

    totalValue += value;
    totalCostBasis += costBasis;

    // Calculate day change if previous price exists
    if (holding.previousPrice) {
      const previousValue = holding.shares * holding.previousPrice;
      totalDayChange += value - previousValue;
    }

    // Track allocation by account type
    if (!allocationMap[holding.accountType]) {
      allocationMap[holding.accountType] = 0;
    }
    allocationMap[holding.accountType] += value;
  });

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  const dayChangePercent =
    totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

  const allocation = Object.entries(allocationMap).map(([type, value]) => ({
    type,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }));

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    dayChange: totalDayChange,
    dayChangePercent,
    allocation,
    holdings,
  };
}

// Get all holdings
async function getHoldings(userId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "HOLDING#",
    },
  };

  const result = await dynamodb.query(params).promise();
  return result.Items || [];
}

// Add holding
async function addHolding(userId, holdingData) {
  const holdingId = uuidv4();
  const now = new Date().toISOString();

  const holding = {
    PK: `USER#${userId}`,
    SK: `HOLDING#${holdingId}`,
    holdingId,
    userId,
    symbol: holdingData.symbol.toUpperCase(),
    name: holdingData.name,
    shares: parseFloat(holdingData.shares),
    costBasis: parseFloat(holdingData.costBasis),
    currentPrice: parseFloat(holdingData.currentPrice || holdingData.costBasis),
    accountType: holdingData.accountType,
    lastUpdated: now,
    createdAt: now,
  };

  await dynamodb
    .put({
      TableName: TABLE_NAME,
      Item: holding,
    })
    .promise();

  return holding;
}

// Update holding
async function updateHolding(userId, holdingId, updates) {
  const now = new Date().toISOString();

  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (updates.shares !== undefined) {
    updateExpressions.push("#shares = :shares");
    expressionAttributeNames["#shares"] = "shares";
    expressionAttributeValues[":shares"] = parseFloat(updates.shares);
  }

  if (updates.costBasis !== undefined) {
    updateExpressions.push("#costBasis = :costBasis");
    expressionAttributeNames["#costBasis"] = "costBasis";
    expressionAttributeValues[":costBasis"] = parseFloat(updates.costBasis);
  }

  if (updates.currentPrice !== undefined) {
    updateExpressions.push("#currentPrice = :currentPrice");
    expressionAttributeNames["#currentPrice"] = "currentPrice";
    expressionAttributeValues[":currentPrice"] = parseFloat(
      updates.currentPrice,
    );
  }

  if (updates.accountType) {
    updateExpressions.push("#accountType = :accountType");
    expressionAttributeNames["#accountType"] = "accountType";
    expressionAttributeValues[":accountType"] = updates.accountType;
  }

  updateExpressions.push("#lastUpdated = :lastUpdated");
  expressionAttributeNames["#lastUpdated"] = "lastUpdated";
  expressionAttributeValues[":lastUpdated"] = now;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `HOLDING#${holdingId}`,
    },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}

// Delete holding
async function deleteHolding(userId, holdingId) {
  await dynamodb
    .delete({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `HOLDING#${holdingId}`,
      },
    })
    .promise();

  return { success: true };
}

// Main handler
exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.httpMethod === "OPTIONS") {
    return response(200, {});
  }

  try {
    const userId = getUserId(event);
    if (!userId) {
      return response(401, { error: "Unauthorized" });
    }

    const path = event.path;
    const method = event.httpMethod;
    const pathParts = path.split("/").filter((p) => p);

    // GET /investments - Portfolio overview
    if (method === "GET" && pathParts[pathParts.length - 1] === "investments") {
      const portfolio = await getPortfolio(userId);
      return response(200, portfolio);
    }

    // GET /investments/holdings - List holdings
    if (method === "GET" && pathParts[pathParts.length - 1] === "holdings") {
      const holdings = await getHoldings(userId);
      return response(200, { holdings });
    }

    // POST /investments/holdings - Add holding
    if (method === "POST" && pathParts[pathParts.length - 1] === "holdings") {
      const body = JSON.parse(event.body);

      // Validation
      if (
        !body.symbol ||
        !body.name ||
        !body.shares ||
        !body.costBasis ||
        !body.accountType
      ) {
        return response(400, { error: "Missing required fields" });
      }

      const holding = await addHolding(userId, body);
      return response(201, holding);
    }

    // PUT /investments/holdings/{id} - Update holding
    if (method === "PUT" && pathParts[pathParts.length - 2] === "holdings") {
      const holdingId = pathParts[pathParts.length - 1];
      const body = JSON.parse(event.body);

      const updated = await updateHolding(userId, holdingId, body);
      return response(200, updated);
    }

    // DELETE /investments/holdings/{id} - Delete holding
    if (method === "DELETE" && pathParts[pathParts.length - 2] === "holdings") {
      const holdingId = pathParts[pathParts.length - 1];

      await deleteHolding(userId, holdingId);
      return response(200, { success: true });
    }

    // GET /investments/performance - Performance over time (placeholder)
    if (method === "GET" && pathParts[pathParts.length - 1] === "performance") {
      const period = event.queryStringParameters?.period || "1M"; // 1M, 3M, 6M, 1Y, ALL
      const performance = await getPerformanceHistory(userId, period);
      return response(200, performance);
    }

    // POST /investments/snapshot - Save current portfolio snapshot
    if (method === "POST" && pathParts[pathParts.length - 1] === "snapshot") {
      const snapshot = await savePortfolioSnapshot(userId);
      return response(201, snapshot);
    }

    // GET /investments/health
    if (method === "GET" && pathParts[pathParts.length - 1] === "health") {
      return response(200, { status: "healthy", service: "investments" });
    }

    // GET /investments/news?symbols=AAPL,MSFT&topics=finance,economy
    if (method === "GET" && pathParts[pathParts.length - 1] === "news") {
      const symbols = event.queryStringParameters?.symbols || null;
      const topics = event.queryStringParameters?.topics || "finance,economy,earnings";
      const news = await getMarketNews(symbols, topics);
      return response(200, news);
    }

    // GET /investments/signals?symbols=AAPL,MSFT
    if (method === "GET" && pathParts[pathParts.length - 1] === "signals") {
      const symbols = event.queryStringParameters?.symbols || null;
      const signals = await getTrendingSignals(userId, symbols);
      return response(200, signals);
    }

    return response(404, { error: "Not found" });
  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message });
  }
};

// Get performance history
async function getPerformanceHistory(userId, period) {
  // Query portfolio snapshots
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "PORTFOLIO_SNAPSHOT#",
    },
    ScanIndexForward: false, // Most recent first
  };

  const result = await dynamodb.query(params).promise();
  const snapshots = result.Items || [];

  // Filter by period
  const now = new Date();
  let startDate;

  switch (period) {
    case "1M":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "3M":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "6M":
      startDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case "1Y":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "ALL":
      startDate = new Date(0); // Beginning of time
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const filteredSnapshots = snapshots
    .filter((s) => new Date(s.date) >= startDate)
    .reverse(); // Oldest first for chart

  // Calculate performance metrics
  if (filteredSnapshots.length === 0) {
    return {
      performance: [],
      totalReturn: 0,
      totalReturnPercent: 0,
      message: "No performance data available yet",
    };
  }

  const firstSnapshot = filteredSnapshots[0];
  const lastSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

  const totalReturn = lastSnapshot.totalValue - firstSnapshot.totalValue;
  const totalReturnPercent =
    firstSnapshot.totalValue > 0
      ? (totalReturn / firstSnapshot.totalValue) * 100
      : 0;

  return {
    performance: filteredSnapshots.map((s) => ({
      date: s.date,
      totalValue: s.totalValue,
      totalGainLoss: s.totalGainLoss,
      totalGainLossPercent: s.totalGainLossPercent,
    })),
    totalReturn,
    totalReturnPercent,
    period,
  };
}

// Save portfolio snapshot (called by scheduled Lambda or on-demand)
async function savePortfolioSnapshot(userId) {
  const portfolio = await getPortfolio(userId);
  const now = new Date().toISOString();
  const dateKey = now.split("T")[0]; // YYYY-MM-DD

  const snapshot = {
    PK: `USER#${userId}`,
    SK: `PORTFOLIO_SNAPSHOT#${dateKey}`,
    userId,
    date: dateKey,
    totalValue: portfolio.totalValue,
    totalCostBasis: portfolio.totalCostBasis,
    totalGainLoss: portfolio.totalGainLoss,
    totalGainLossPercent: portfolio.totalGainLossPercent,
    allocation: portfolio.allocation,
    createdAt: now,
  };

  await dynamodb
    .put({
      TableName: TABLE_NAME,
      Item: snapshot,
    })
    .promise();

  return snapshot;
}

// ─── Alpha Vantage helpers ────────────────────────────────────────────────────

/** Fetch the Alpha Vantage API key from Secrets Manager (cached per Lambda warm start) */
let _avApiKey = null;
async function getAlphaVantageKey() {
  if (_avApiKey) return _avApiKey;
  const secretName = process.env.ALPHAVANTAGE_SECRET_NAME || 'budgetbuddy/alphavantage/api-key';
  const sm = new AWS.SecretsManager({ region: process.env.AWS_REGION || 'us-east-1' });
  try {
    const data = await sm.getSecretValue({ SecretId: secretName }).promise();
    _avApiKey = data.SecretString;
    return _avApiKey;
  } catch (err) {
    console.error('Failed to fetch Alpha Vantage key:', err.message);
    return null;
  }
}

/**
 * GET /investments/news
 * Returns market news articles for the user's portfolio symbols or general finance topics.
 *
 * Alpha Vantage endpoint: NEWS_SENTIMENT
 * Docs: https://www.alphavantage.co/documentation/#news-sentiment
 */
async function getMarketNews(symbols, topics) {
  const apiKey = await getAlphaVantageKey();
  if (!apiKey) {
    return { news: [], message: 'Market news unavailable — API key not configured', cached: false };
  }

  try {
    // Build query params
    const queryParts = [`function=NEWS_SENTIMENT`, `apikey=${apiKey}`, `limit=15`, `sort=LATEST`];
    if (symbols) queryParts.push(`tickers=${encodeURIComponent(symbols)}`); // e.g., "AAPL,MSFT,TSLA"
    if (topics) queryParts.push(`topics=${encodeURIComponent(topics)}`); // e.g., "finance,economy,earnings"

    const url = `https://www.alphavantage.co/query?${queryParts.join('&')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

    const data = await res.json();
    if (data.Information) {
      // Rate limit hit
      console.warn('Alpha Vantage rate limit:', data.Information);
      return { news: [], message: 'Market news rate limit reached. Try again in a minute.', cached: false };
    }

    const feed = data.feed || [];
    const articles = feed.map(item => ({
      id: item.url,
      title: item.title,
      summary: item.summary?.substring(0, 200) + (item.summary?.length > 200 ? '…' : ''),
      url: item.url,
      source: item.source,
      publishedAt: item.time_published ? formatAvTimestamp(item.time_published) : null,
      sentiment: item.overall_sentiment_label || 'Neutral', // Bearish / Neutral / Bullish
      sentimentScore: item.overall_sentiment_score ? parseFloat(item.overall_sentiment_score) : 0,
      relatedTickers: (item.ticker_sentiment || []).map(t => ({
        ticker: t.ticker,
        relevance: parseFloat(t.relevance_score || '0'),
        sentiment: t.ticker_sentiment_label,
      })).slice(0, 4),
      bannerImage: item.banner_image || null,
      categoryWithinSource: item.category_within_source,
    }));

    return {
      news: articles,
      count: articles.length,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (err) {
    console.error('Error fetching market news:', err.message);
    return { news: [], message: 'Unable to fetch market news right now.', error: err.message, cached: false };
  }
}

/**
 * GET /investments/signals
 * Returns trending/gainers/losers market signals.
 * Uses TOP_GAINERS_LOSERS endpoint + optional quote lookups for user's holdings.
 *
 * Alpha Vantage endpoint: TOP_GAINERS_LOSERS
 * Docs: https://www.alphavantage.co/documentation/#top-gainer-loser
 */
async function getTrendingSignals(userId, symbols) {
  const apiKey = await getAlphaVantageKey();
  if (!apiKey) {
    return { signals: [], message: 'Market signals unavailable — API key not configured' };
  }

  try {
    // Fetch top gainers/losers/most active
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

    const data = await res.json();
    if (data.Information) {
      return { signals: [], message: 'Rate limit reached. Try again in a minute.' };
    }

    const formatSignal = (item, category) => ({
      ticker: item.ticker,
      price: item.price,
      changeAmount: item.change_amount,
      changePercent: item.change_percentage,
      volume: item.volume,
      category, // 'gainer' | 'loser' | 'active'
    });

    const gainers = (data.top_gainers || []).slice(0, 5).map(s => formatSignal(s, 'gainer'));
    const losers = (data.top_losers || []).slice(0, 5).map(s => formatSignal(s, 'loser'));
    const active = (data.most_actively_traded || []).slice(0, 5).map(s => formatSignal(s, 'active'));

    // If user has holdings, also add signals for those specific tickers
    let portfolioSignals = [];
    if (symbols) {
      const tickerList = symbols.split(',').slice(0, 5); // max 5 to stay under rate limits
      portfolioSignals = tickerList.map(ticker => {
        const allSignals = [...gainers, ...losers, ...active];
        return allSignals.find(s => s.ticker === ticker.trim().toUpperCase());
      }).filter(Boolean);
    }

    return {
      topGainers: gainers,
      topLosers: losers,
      mostActive: active,
      portfolioSignals,
      fetchedAt: new Date().toISOString(),
      marketStatus: data.metadata || null,
    };
  } catch (err) {
    console.error('Error fetching market signals:', err.message);
    return { signals: [], message: 'Unable to fetch market signals right now.', error: err.message };
  }
}

/** Convert Alpha Vantage timestamp "20240115T143000" → ISO string */
function formatAvTimestamp(ts) {
  if (!ts || ts.length < 8) return null;
  try {
    // Format: YYYYMMDDTHHMMSS
    const y = ts.substring(0, 4);
    const mo = ts.substring(4, 6);
    const d = ts.substring(6, 8);
    const h = ts.substring(9, 11) || '00';
    const mi = ts.substring(11, 13) || '00';
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`).toISOString();
  } catch {
    return null;
  }
}
