const AWS = require("aws-sdk");
const https = require("https");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

const TABLE_NAME = process.env.TABLE_NAME || "BudgetBuddyTable";
const ALPHA_VANTAGE_SECRET_NAME =
  process.env.ALPHA_VANTAGE_SECRET_NAME || "budgetbuddy/alpha-vantage-api-key";

// Cache for API key
let cachedApiKey = null;

// Get Alpha Vantage API key from Secrets Manager
async function getApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const secret = await secretsManager
      .getSecretValue({
        SecretId: ALPHA_VANTAGE_SECRET_NAME,
      })
      .promise();

    cachedApiKey = JSON.parse(secret.SecretString).apiKey;
    return cachedApiKey;
  } catch (error) {
    console.error("Failed to get API key from Secrets Manager:", error);
    throw error;
  }
}

// Fetch stock price from Alpha Vantage
function fetchStockPrice(symbol, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);

            // Check for API errors
            if (json["Error Message"]) {
              reject(
                new Error(`Alpha Vantage error: ${json["Error Message"]}`),
              );
              return;
            }

            if (json["Note"]) {
              // Rate limit hit
              reject(new Error("Alpha Vantage rate limit exceeded"));
              return;
            }

            const quote = json["Global Quote"];
            if (!quote || !quote["05. price"]) {
              reject(new Error(`No price data for symbol: ${symbol}`));
              return;
            }

            resolve({
              symbol,
              price: parseFloat(quote["05. price"]),
              change: parseFloat(quote["09. change"]),
              changePercent: parseFloat(
                quote["10. change percent"]?.replace("%", "") || 0,
              ),
              volume: parseInt(quote["06. volume"]),
              lastUpdated: quote["07. latest trading day"],
            });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Get all unique symbols from all users' holdings
async function getAllSymbols() {
  const symbols = new Set();
  let lastEvaluatedKey = null;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":sk": "HOLDING#",
      },
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamodb.scan(params).promise();

    result.Items.forEach((item) => {
      if (item.symbol) {
        symbols.add(item.symbol.toUpperCase());
      }
    });

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return Array.from(symbols);
}

// Update holdings with new price
async function updateHoldingsPrice(symbol, price) {
  const now = new Date().toISOString();
  let lastEvaluatedKey = null;
  let updatedCount = 0;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(SK, :sk) AND symbol = :symbol",
      ExpressionAttributeValues: {
        ":sk": "HOLDING#",
        ":symbol": symbol,
      },
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamodb.scan(params).promise();

    // Update each holding
    for (const item of result.Items) {
      await dynamodb
        .update({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
          UpdateExpression: "SET currentPrice = :price, lastUpdated = :updated",
          ExpressionAttributeValues: {
            ":price": price,
            ":updated": now,
          },
        })
        .promise();

      updatedCount++;
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return updatedCount;
}

// Main handler
exports.handler = async (_event) => {
  console.log("Starting stock price update job");

  try {
    // Get API key
    const apiKey = await getApiKey();

    // Get all unique symbols
    const symbols = await getAllSymbols();
    console.log(`Found ${symbols.length} unique symbols to update`);

    if (symbols.length === 0) {
      console.log("No holdings found, skipping update");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No holdings to update",
          symbolsProcessed: 0,
          holdingsUpdated: 0,
        }),
      };
    }

    const results = {
      success: [],
      failed: [],
      totalHoldingsUpdated: 0,
    };

    // Alpha Vantage free tier: 5 calls/min, 500 calls/day
    // Add delay between requests to respect rate limit
    const DELAY_MS = 12000; // 12 seconds = 5 calls/min

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];

      try {
        console.log(
          `Fetching price for ${symbol} (${i + 1}/${symbols.length})`,
        );

        const priceData = await fetchStockPrice(symbol, apiKey);
        const updatedCount = await updateHoldingsPrice(symbol, priceData.price);

        results.success.push({
          symbol,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          holdingsUpdated: updatedCount,
        });

        results.totalHoldingsUpdated += updatedCount;

        console.log(
          `Updated ${updatedCount} holdings for ${symbol} with price $${priceData.price}`,
        );

        // Add delay between requests (except for last one)
        if (i < symbols.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        console.error(`Failed to update ${symbol}:`, error.message);
        results.failed.push({
          symbol,
          error: error.message,
        });
      }
    }

    console.log("Stock price update job completed", {
      symbolsProcessed: symbols.length,
      successful: results.success.length,
      failed: results.failed.length,
      totalHoldingsUpdated: results.totalHoldingsUpdated,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Stock price update completed",
        symbolsProcessed: symbols.length,
        successful: results.success.length,
        failed: results.failed.length,
        totalHoldingsUpdated: results.totalHoldingsUpdated,
        results,
      }),
    };
  } catch (error) {
    console.error("Stock price update job failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Stock price update failed",
        message: error.message,
      }),
    };
  }
};
