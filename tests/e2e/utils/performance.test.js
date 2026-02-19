/**
 * Unit tests for E2E performance measurement utilities
 */

const {
  checkPerformanceThresholds,
  detectPerformanceRegression,
  PERFORMANCE_THRESHOLDS,
} = require("./performance");

describe("E2E Performance Utilities", () => {
  describe("checkPerformanceThresholds", () => {
    it("should pass when all metrics are within thresholds", () => {
      const metrics = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("should fail when page load exceeds threshold", () => {
      const metrics = {
        loadTime: 2500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].metric).toBe("pageLoad");
      expect(result.failures[0].value).toBe(2500);
      expect(result.failures[0].threshold).toBe(
        PERFORMANCE_THRESHOLDS.pageLoad,
      );
    });

    it("should fail when API p95 exceeds threshold", () => {
      const metrics = {
        loadTime: 1500,
        p95: 600,
        timeToInteractive: 2500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].metric).toBe("apiResponse");
      expect(result.failures[0].value).toBe(600);
      expect(result.failures[0].threshold).toBe(
        PERFORMANCE_THRESHOLDS.apiResponse,
      );
    });

    it("should fail when time to interactive exceeds threshold", () => {
      const metrics = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 3500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].metric).toBe("timeToInteractive");
      expect(result.failures[0].value).toBe(3500);
      expect(result.failures[0].threshold).toBe(
        PERFORMANCE_THRESHOLDS.timeToInteractive,
      );
    });

    it("should fail with multiple threshold violations", () => {
      const metrics = {
        loadTime: 2500,
        p95: 600,
        timeToInteractive: 3500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(3);
    });

    it("should handle missing metrics gracefully", () => {
      const metrics = {
        loadTime: 1500,
      };

      const result = checkPerformanceThresholds(metrics);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe("detectPerformanceRegression", () => {
    it("should detect no regression when metrics are similar", () => {
      const current = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const baseline = {
        loadTime: 1450,
        p95: 390,
        timeToInteractive: 2450,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(false);
      expect(result.regressions).toHaveLength(0);
    });

    it("should detect regression when load time increases significantly", () => {
      const current = {
        loadTime: 2000,
        p95: 400,
        timeToInteractive: 2500,
      };

      const baseline = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(true);
      expect(result.regressions).toHaveLength(1);
      expect(result.regressions[0].metric).toBe("loadTime");
      expect(result.regressions[0].current).toBe(2000);
      expect(result.regressions[0].baseline).toBe(1500);
      expect(parseFloat(result.regressions[0].percentageChange)).toBeCloseTo(
        33.33,
        1,
      );
    });

    it("should detect regression when API p95 increases significantly", () => {
      const current = {
        loadTime: 1500,
        p95: 500,
        timeToInteractive: 2500,
      };

      const baseline = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(true);
      expect(result.regressions).toHaveLength(1);
      expect(result.regressions[0].metric).toBe("p95");
    });

    it("should detect multiple regressions", () => {
      const current = {
        loadTime: 2200,
        p95: 550,
        timeToInteractive: 3300,
      };

      const baseline = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(true);
      expect(result.regressions).toHaveLength(3);
    });

    it("should use custom threshold percentage", () => {
      const current = {
        loadTime: 1600,
        p95: 400,
        timeToInteractive: 2500,
      };

      const baseline = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      // 5% threshold - should detect regression
      const result = detectPerformanceRegression(current, baseline, 5);

      expect(result.hasRegression).toBe(true);
      expect(result.regressions).toHaveLength(1);
    });

    it("should handle missing metrics gracefully", () => {
      const current = {
        loadTime: 1500,
      };

      const baseline = {
        loadTime: 1450,
        p95: 400,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(false);
      expect(result.regressions).toHaveLength(0);
    });

    it("should not detect regression for improvements", () => {
      const current = {
        loadTime: 1200,
        p95: 350,
        timeToInteractive: 2200,
      };

      const baseline = {
        loadTime: 1500,
        p95: 400,
        timeToInteractive: 2500,
      };

      const result = detectPerformanceRegression(current, baseline);

      expect(result.hasRegression).toBe(false);
      expect(result.regressions).toHaveLength(0);
    });
  });

  describe("PERFORMANCE_THRESHOLDS", () => {
    it("should have correct threshold values", () => {
      expect(PERFORMANCE_THRESHOLDS.pageLoad).toBe(2000);
      expect(PERFORMANCE_THRESHOLDS.apiResponse).toBe(500);
      expect(PERFORMANCE_THRESHOLDS.timeToInteractive).toBe(3000);
    });
  });
});
