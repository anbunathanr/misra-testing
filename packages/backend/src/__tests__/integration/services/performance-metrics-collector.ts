/**
 * Performance Metrics Collector
 * 
 * Collects and analyzes performance metrics during integration tests.
 * Tracks latency, throughput, and resource usage across all systems.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'seconds' | 'count' | 'bytes';
  timestamp: string;
  tags: Record<string, string>;
}

export interface PerformanceStatistics {
  metrics: Map<string, MetricStats>;
  summary: {
    totalTests: number;
    totalDuration: number;
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface MetricStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

interface MeasurementTracker {
  startTime: number;
  tags: Record<string, string>;
}

export class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private activeMeasurements: Map<string, MeasurementTracker> = new Map();

  /**
   * Start measuring a metric
   */
  startMeasurement(metricName: string, tags: Record<string, string> = {}): void {
    this.activeMeasurements.set(metricName, {
      startTime: Date.now(),
      tags,
    });
  }

  /**
   * End measuring a metric and record the duration
   */
  endMeasurement(metricName: string): void {
    const tracker = this.activeMeasurements.get(metricName);
    if (!tracker) {
      console.warn(`No active measurement found for: ${metricName}`);
      return;
    }

    const duration = Date.now() - tracker.startTime;
    this.recordMetric({
      name: metricName,
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: tracker.tags,
    });

    this.activeMeasurements.delete(metricName);
  }

  /**
   * Record a metric directly
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get metrics filtered by tag
   */
  getMetricsByTag(tagKey: string, tagValue: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.tags[tagKey] === tagValue);
  }

  /**
   * Calculate statistics for all metrics
   */
  getStatistics(): PerformanceStatistics {
    const metricsByName = new Map<string, PerformanceMetric[]>();
    
    // Group metrics by name
    for (const metric of this.metrics) {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    }

    // Calculate stats for each metric
    const metricsStats = new Map<string, MetricStats>();
    for (const [name, metrics] of metricsByName.entries()) {
      metricsStats.set(name, this.calculateStats(metrics));
    }

    // Calculate overall summary
    const allDurations = this.metrics
      .filter(m => m.unit === 'ms' || m.unit === 'seconds')
      .map(m => m.unit === 'seconds' ? m.value * 1000 : m.value);

    const summary = {
      totalTests: this.metrics.length,
      totalDuration: allDurations.reduce((sum, val) => sum + val, 0),
      averageDuration: allDurations.length > 0 
        ? allDurations.reduce((sum, val) => sum + val, 0) / allDurations.length 
        : 0,
      p50: this.calculatePercentile(allDurations, 50),
      p95: this.calculatePercentile(allDurations, 95),
      p99: this.calculatePercentile(allDurations, 99),
    };

    return {
      metrics: metricsStats,
      summary,
    };
  }

  /**
   * Calculate statistics for a set of metrics
   */
  private calculateStats(metrics: PerformanceMetric[]): MetricStats {
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    
    if (values.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
      };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      mean,
      median: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
      stdDev,
    };
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Generate a performance summary report
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const lines: string[] = [];

    lines.push('=== Performance Metrics Report ===\n');
    lines.push(`Total Metrics: ${stats.summary.totalTests}`);
    lines.push(`Total Duration: ${stats.summary.totalDuration.toFixed(2)}ms`);
    lines.push(`Average Duration: ${stats.summary.averageDuration.toFixed(2)}ms`);
    lines.push(`P50 (Median): ${stats.summary.p50.toFixed(2)}ms`);
    lines.push(`P95: ${stats.summary.p95.toFixed(2)}ms`);
    lines.push(`P99: ${stats.summary.p99.toFixed(2)}ms\n`);

    lines.push('=== Metrics by Name ===\n');
    for (const [name, metricStats] of stats.metrics.entries()) {
      lines.push(`${name}:`);
      lines.push(`  Count: ${metricStats.count}`);
      lines.push(`  Min: ${metricStats.min.toFixed(2)}`);
      lines.push(`  Max: ${metricStats.max.toFixed(2)}`);
      lines.push(`  Mean: ${metricStats.mean.toFixed(2)}`);
      lines.push(`  Median: ${metricStats.median.toFixed(2)}`);
      lines.push(`  P95: ${metricStats.p95.toFixed(2)}`);
      lines.push(`  P99: ${metricStats.p99.toFixed(2)}`);
      lines.push(`  StdDev: ${metricStats.stdDev.toFixed(2)}\n`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.activeMeasurements.clear();
  }

  /**
   * Get active measurements (for debugging)
   */
  getActiveMeasurements(): string[] {
    return Array.from(this.activeMeasurements.keys());
  }
}
