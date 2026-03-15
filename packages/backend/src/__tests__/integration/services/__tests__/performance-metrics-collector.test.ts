/**
 * Performance Metrics Collector Tests
 */

import { PerformanceMetricsCollector, PerformanceMetric } from '../performance-metrics-collector';

describe('PerformanceMetricsCollector', () => {
  let collector: PerformanceMetricsCollector;

  beforeEach(() => {
    collector = new PerformanceMetricsCollector();
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      const metric: PerformanceMetric = {
        name: 'test-latency',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: { test: 'value' },
      };

      collector.recordMetric(metric);
      const metrics = collector.getMetrics();

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(metric);
    });

    it('should record multiple metrics', () => {
      collector.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'metric2',
        value: 200,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      expect(collector.getMetrics()).toHaveLength(2);
    });
  });

  describe('startMeasurement and endMeasurement', () => {
    it('should measure duration between start and end', async () => {
      collector.startMeasurement('test-operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      collector.endMeasurement('test-operation');

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test-operation');
      expect(metrics[0].value).toBeGreaterThanOrEqual(45); // Allow some variance
      expect(metrics[0].unit).toBe('ms');
    });

    it('should include tags in measurement', () => {
      collector.startMeasurement('test-operation', { category: 'integration', system: 'ai-generation' });
      collector.endMeasurement('test-operation');

      const metrics = collector.getMetrics();
      expect(metrics[0].tags).toEqual({ category: 'integration', system: 'ai-generation' });
    });

    it('should handle ending non-existent measurement gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      collector.endMeasurement('non-existent');

      expect(consoleSpy).toHaveBeenCalledWith('No active measurement found for: non-existent');
      expect(collector.getMetrics()).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('should track multiple concurrent measurements', () => {
      collector.startMeasurement('operation1');
      collector.startMeasurement('operation2');
      collector.startMeasurement('operation3');

      collector.endMeasurement('operation1');
      collector.endMeasurement('operation2');
      collector.endMeasurement('operation3');

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics.map(m => m.name)).toEqual(['operation1', 'operation2', 'operation3']);
    });
  });

  describe('getMetricsByName', () => {
    beforeEach(() => {
      collector.recordMetric({
        name: 'latency',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'latency',
        value: 150,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'throughput',
        value: 50,
        unit: 'count',
        timestamp: new Date().toISOString(),
        tags: {},
      });
    });

    it('should filter metrics by name', () => {
      const latencyMetrics = collector.getMetricsByName('latency');
      expect(latencyMetrics).toHaveLength(2);
      expect(latencyMetrics.every(m => m.name === 'latency')).toBe(true);
    });

    it('should return empty array for non-existent metric name', () => {
      const metrics = collector.getMetricsByName('non-existent');
      expect(metrics).toHaveLength(0);
    });
  });

  describe('getMetricsByTag', () => {
    beforeEach(() => {
      collector.recordMetric({
        name: 'metric1',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: { environment: 'test', system: 'ai' },
      });

      collector.recordMetric({
        name: 'metric2',
        value: 150,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: { environment: 'test', system: 'execution' },
      });

      collector.recordMetric({
        name: 'metric3',
        value: 200,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: { environment: 'prod', system: 'ai' },
      });
    });

    it('should filter metrics by tag', () => {
      const testMetrics = collector.getMetricsByTag('environment', 'test');
      expect(testMetrics).toHaveLength(2);
      expect(testMetrics.every(m => m.tags.environment === 'test')).toBe(true);
    });

    it('should return empty array for non-matching tag', () => {
      const metrics = collector.getMetricsByTag('environment', 'staging');
      expect(metrics).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Record metrics with known values for testing statistics
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      values.forEach(value => {
        collector.recordMetric({
          name: 'test-metric',
          value,
          unit: 'ms',
          timestamp: new Date().toISOString(),
          tags: {},
        });
      });
    });

    it('should calculate correct statistics', () => {
      const stats = collector.getStatistics();
      const metricStats = stats.metrics.get('test-metric')!;

      expect(metricStats.count).toBe(10);
      expect(metricStats.min).toBe(10);
      expect(metricStats.max).toBe(100);
      expect(metricStats.mean).toBe(55);
      expect(metricStats.median).toBe(55);
    });

    it('should calculate percentiles correctly', () => {
      const stats = collector.getStatistics();
      const metricStats = stats.metrics.get('test-metric')!;

      expect(metricStats.p95).toBeCloseTo(95.5, 1);
      expect(metricStats.p99).toBeCloseTo(99.1, 1);
    });

    it('should calculate standard deviation', () => {
      const stats = collector.getStatistics();
      const metricStats = stats.metrics.get('test-metric')!;

      // For values 10-100, stdDev should be approximately 28.72
      expect(metricStats.stdDev).toBeCloseTo(28.72, 1);
    });

    it('should calculate summary statistics', () => {
      const stats = collector.getStatistics();

      expect(stats.summary.totalTests).toBe(10);
      expect(stats.summary.totalDuration).toBe(550); // Sum of 10-100
      expect(stats.summary.averageDuration).toBe(55);
      expect(stats.summary.p50).toBe(55);
      expect(stats.summary.p95).toBeCloseTo(95.5, 1);
      expect(stats.summary.p99).toBeCloseTo(99.1, 1);
    });

    it('should handle empty metrics', () => {
      collector.reset();
      const stats = collector.getStatistics();

      expect(stats.summary.totalTests).toBe(0);
      expect(stats.summary.totalDuration).toBe(0);
      expect(stats.summary.averageDuration).toBe(0);
    });

    it('should group statistics by metric name', () => {
      collector.recordMetric({
        name: 'other-metric',
        value: 200,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      const stats = collector.getStatistics();

      expect(stats.metrics.size).toBe(2);
      expect(stats.metrics.has('test-metric')).toBe(true);
      expect(stats.metrics.has('other-metric')).toBe(true);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      collector.recordMetric({
        name: 'api-latency',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'api-latency',
        value: 150,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'db-query',
        value: 50,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });
    });

    it('should generate a formatted report', () => {
      const report = collector.generateReport();

      expect(report).toContain('Performance Metrics Report');
      expect(report).toContain('Total Metrics: 3');
      expect(report).toContain('api-latency:');
      expect(report).toContain('db-query:');
      expect(report).toContain('Count: 2'); // api-latency count
      expect(report).toContain('Count: 1'); // db-query count
    });

    it('should include summary statistics in report', () => {
      const report = collector.generateReport();

      expect(report).toContain('Total Duration:');
      expect(report).toContain('Average Duration:');
      expect(report).toContain('P50 (Median):');
      expect(report).toContain('P95:');
      expect(report).toContain('P99:');
    });

    it('should include per-metric statistics in report', () => {
      const report = collector.generateReport();

      expect(report).toContain('Min:');
      expect(report).toContain('Max:');
      expect(report).toContain('Mean:');
      expect(report).toContain('Median:');
      expect(report).toContain('StdDev:');
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      collector.recordMetric({
        name: 'test',
        value: 100,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.startMeasurement('active-measurement');

      expect(collector.getMetrics()).toHaveLength(1);
      expect(collector.getActiveMeasurements()).toHaveLength(1);

      collector.reset();

      expect(collector.getMetrics()).toHaveLength(0);
      expect(collector.getActiveMeasurements()).toHaveLength(0);
    });
  });

  describe('getActiveMeasurements', () => {
    it('should return list of active measurement names', () => {
      collector.startMeasurement('measurement1');
      collector.startMeasurement('measurement2');
      collector.startMeasurement('measurement3');

      const active = collector.getActiveMeasurements();

      expect(active).toHaveLength(3);
      expect(active).toContain('measurement1');
      expect(active).toContain('measurement2');
      expect(active).toContain('measurement3');
    });

    it('should return empty array when no active measurements', () => {
      expect(collector.getActiveMeasurements()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle single metric statistics', () => {
      collector.recordMetric({
        name: 'single',
        value: 42,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      const stats = collector.getStatistics();
      const metricStats = stats.metrics.get('single')!;

      expect(metricStats.count).toBe(1);
      expect(metricStats.min).toBe(42);
      expect(metricStats.max).toBe(42);
      expect(metricStats.mean).toBe(42);
      expect(metricStats.median).toBe(42);
      expect(metricStats.stdDev).toBe(0);
    });

    it('should handle metrics with different units', () => {
      collector.recordMetric({
        name: 'time',
        value: 1,
        unit: 'seconds',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'size',
        value: 1024,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      collector.recordMetric({
        name: 'count',
        value: 50,
        unit: 'count',
        timestamp: new Date().toISOString(),
        tags: {},
      });

      const stats = collector.getStatistics();
      
      // Summary should convert seconds to ms
      expect(stats.summary.totalDuration).toBe(1000); // 1 second = 1000ms
    });
  });
});
