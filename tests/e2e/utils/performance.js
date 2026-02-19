/**
 * E2E Performance Measurement Utilities
 *
 * Provides functions for measuring and validating performance:
 * - Page load time measurement
 * - API response time measurement
 * - Time to interactive measurement
 * - Performance threshold checking
 * - Performance regression detection
 *
 * Thresholds:
 * - Page load: < 2s
 * - API p95: < 500ms
 * - Time to interactive: < 3s
 */

/**
 * Performance thresholds (in milliseconds)
 */
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 2000, // 2 seconds
  apiResponse: 500, // 500ms (p95)
  timeToInteractive: 3000, // 3 seconds
};

/**
 * Measure page load time
 * @param {Page} page - Playwright page object
 * @param {string} url - URL to load
 * @returns {Promise<Object>} Performance metrics
 */
async function measurePageLoad(page, url) {
  const startTime = Date.now();

  await page.goto(url, { waitUntil: "load" });

  const loadTime = Date.now() - startTime;

  // Get additional metrics from browser
  const metrics = await page.evaluate(() => {
    const perfData = window.performance.timing;
    return {
      domContentLoaded:
        perfData.domContentLoadedEventEnd - perfData.navigationStart,
      loadComplete: perfData.loadEventEnd - perfData.navigationStart,
      firstPaint: performance.getEntriesByType("paint")[0]?.startTime || 0,
    };
  });

  return {
    loadTime,
    domContentLoaded: metrics.domContentLoaded,
    loadComplete: metrics.loadComplete,
    firstPaint: metrics.firstPaint,
    url,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Measure API response time
 * @param {Page} page - Playwright page object
 * @param {Function} apiCall - Function that triggers the API call
 * @returns {Promise<Object>} Performance metrics
 */
async function measureApiResponse(page, apiCall) {
  const apiMetrics = [];

  // Listen for API requests
  page.on("response", (response) => {
    const url = response.url();
    const timing = response.timing();

    if (url.includes("/api/") || url.includes("/lambda/")) {
      apiMetrics.push({
        url,
        status: response.status(),
        responseTime: timing ? timing.responseEnd : 0,
        timestamp: new Date().toISOString(),
      });
    }
  });

  const startTime = Date.now();
  await apiCall();
  const totalTime = Date.now() - startTime;

  // Calculate p95
  const responseTimes = apiMetrics
    .map((m) => m.responseTime)
    .sort((a, b) => a - b);
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p95 = responseTimes[p95Index] || 0;

  return {
    totalTime,
    apiCallCount: apiMetrics.length,
    p95,
    min: responseTimes[0] || 0,
    max: responseTimes[responseTimes.length - 1] || 0,
    average:
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
    calls: apiMetrics,
  };
}

/**
 * Measure time to interactive
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Performance metrics
 */
async function measureTimeToInteractive(page) {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Wait for page to be fully interactive
      if (document.readyState === "complete") {
        const perfData = window.performance.timing;
        resolve({
          timeToInteractive: perfData.domInteractive - perfData.navigationStart,
          domContentLoaded:
            perfData.domContentLoadedEventEnd - perfData.navigationStart,
          loadComplete: perfData.loadEventEnd - perfData.navigationStart,
        });
      } else {
        window.addEventListener("load", () => {
          const perfData = window.performance.timing;
          resolve({
            timeToInteractive:
              perfData.domInteractive - perfData.navigationStart,
            domContentLoaded:
              perfData.domContentLoadedEventEnd - perfData.navigationStart,
            loadComplete: perfData.loadEventEnd - perfData.navigationStart,
          });
        });
      }
    });
  });

  return {
    ...metrics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if metrics meet performance thresholds
 * @param {Object} metrics - Performance metrics
 * @returns {Object} Threshold check results
 */
function checkPerformanceThresholds(metrics) {
  const results = {
    passed: true,
    failures: [],
  };

  // Check page load time
  if (metrics.loadTime && metrics.loadTime > PERFORMANCE_THRESHOLDS.pageLoad) {
    results.passed = false;
    results.failures.push({
      metric: "pageLoad",
      value: metrics.loadTime,
      threshold: PERFORMANCE_THRESHOLDS.pageLoad,
      message: `Page load time ${metrics.loadTime}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.pageLoad}ms`,
    });
  }

  // Check API response time (p95)
  if (metrics.p95 && metrics.p95 > PERFORMANCE_THRESHOLDS.apiResponse) {
    results.passed = false;
    results.failures.push({
      metric: "apiResponse",
      value: metrics.p95,
      threshold: PERFORMANCE_THRESHOLDS.apiResponse,
      message: `API p95 response time ${metrics.p95}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.apiResponse}ms`,
    });
  }

  // Check time to interactive
  if (
    metrics.timeToInteractive &&
    metrics.timeToInteractive > PERFORMANCE_THRESHOLDS.timeToInteractive
  ) {
    results.passed = false;
    results.failures.push({
      metric: "timeToInteractive",
      value: metrics.timeToInteractive,
      threshold: PERFORMANCE_THRESHOLDS.timeToInteractive,
      message: `Time to interactive ${metrics.timeToInteractive}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.timeToInteractive}ms`,
    });
  }

  return results;
}

/**
 * Detect performance regression by comparing with baseline
 * @param {Object} currentMetrics - Current performance metrics
 * @param {Object} baselineMetrics - Baseline performance metrics
 * @param {number} threshold - Regression threshold percentage (default 10%)
 * @returns {Object} Regression detection results
 */
function detectPerformanceRegression(
  currentMetrics,
  baselineMetrics,
  threshold = 10,
) {
  const results = {
    hasRegression: false,
    regressions: [],
  };

  const metricsToCheck = ["loadTime", "p95", "timeToInteractive"];

  for (const metric of metricsToCheck) {
    if (currentMetrics[metric] && baselineMetrics[metric]) {
      const current = currentMetrics[metric];
      const baseline = baselineMetrics[metric];
      const percentageChange = ((current - baseline) / baseline) * 100;

      if (percentageChange > threshold) {
        results.hasRegression = true;
        results.regressions.push({
          metric,
          current,
          baseline,
          percentageChange: percentageChange.toFixed(2),
          message: `${metric} regressed by ${percentageChange.toFixed(2)}% (${baseline}ms → ${current}ms)`,
        });
      }
    }
  }

  return results;
}

module.exports = {
  measurePageLoad,
  measureApiResponse,
  measureTimeToInteractive,
  checkPerformanceThresholds,
  detectPerformanceRegression,
  PERFORMANCE_THRESHOLDS,
};
