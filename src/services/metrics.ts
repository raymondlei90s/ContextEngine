/**
 * Prometheus Metrics Service
 * Tracks generation time, token usage, success rates, and other key metrics
 */

import logger from '../utils/logger.js';

// Simple in-memory metrics store (will be replaced with actual Prometheus client)
interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface CounterMetric {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface HistogramMetric {
  name: string;
  help: string;
  values: MetricValue[];
}

class MetricsService {
  private counters: Map<string, CounterMetric>;
  private histograms: Map<string, HistogramMetric>;
  private enabled: boolean;

  constructor() {
    this.counters = new Map();
    this.histograms = new Map();
    this.enabled = true;

    this.initializeMetrics();
  }

  /**
   * Initialize all metrics
   */
  private initializeMetrics(): void {
    // Counters
    this.registerCounter('docs_generated_total', 'Total number of documents generated');
    this.registerCounter('docs_generation_failures_total', 'Total number of generation failures');
    this.registerCounter('claude_api_calls_total', 'Total number of Claude API calls');
    this.registerCounter('claude_cache_hits_total', 'Total number of cache hits');
    this.registerCounter('claude_cache_misses_total', 'Total number of cache misses');
    this.registerCounter('tokens_used_total', 'Total tokens consumed');

    // Histograms
    this.registerHistogram('doc_generation_duration_seconds', 'Time taken to generate documentation');
    this.registerHistogram('repo_analysis_duration_seconds', 'Time taken to analyze repository');
    this.registerHistogram('tokens_per_document', 'Number of tokens used per document');

    logger.info('Metrics service initialized');
  }

  /**
   * Register a counter metric
   */
  private registerCounter(name: string, help: string): void {
    this.counters.set(name, {
      name,
      help,
      values: new Map(),
    });
  }

  /**
   * Register a histogram metric
   */
  private registerHistogram(name: string, help: string): void {
    this.histograms.set(name, {
      name,
      help,
      values: [],
    });
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const counter = this.counters.get(name);
    if (!counter) {
      logger.warn(`Counter ${name} not found`);
      return;
    }

    const key = labels ? JSON.stringify(labels) : 'default';
    const currentValue = counter.values.get(key) || 0;
    counter.values.set(key, currentValue + value);
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const histogram = this.histograms.get(name);
    if (!histogram) {
      logger.warn(`Histogram ${name} not found`);
      return;
    }

    histogram.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // Keep only last 10000 values
    if (histogram.values.length > 10000) {
      histogram.values.shift();
    }
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const counter = this.counters.get(name);
    if (!counter) return 0;

    const key = labels ? JSON.stringify(labels) : 'default';
    return counter.values.get(key) || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    labels?: Record<string, string>
  ): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const histogram = this.histograms.get(name);
    if (!histogram) return null;

    let values = histogram.values;

    // Filter by labels if provided
    if (labels) {
      values = values.filter(
        (v) => v.labels && JSON.stringify(v.labels) === JSON.stringify(labels)
      );
    }

    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = values.map((v) => v.value).sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      count,
      sum,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Record doc generation metrics
   */
  recordDocGeneration(options: {
    success: boolean;
    duration: number;
    tokensUsed: number;
    audience?: string;
    cached?: boolean;
  }): void {
    const { success, duration, tokensUsed, audience, cached } = options;

    if (success) {
      this.incrementCounter('docs_generated_total', 1, { audience });
      this.observeHistogram('doc_generation_duration_seconds', duration / 1000, { audience });
      this.observeHistogram('tokens_per_document', tokensUsed, { audience });
      this.incrementCounter('tokens_used_total', tokensUsed);

      if (cached) {
        this.incrementCounter('claude_cache_hits_total');
      } else {
        this.incrementCounter('claude_cache_misses_total');
        this.incrementCounter('claude_api_calls_total');
      }
    } else {
      this.incrementCounter('docs_generation_failures_total', 1, { audience });
    }

    logger.debug('Recorded doc generation metrics', {
      success,
      duration,
      tokensUsed,
      audience,
      cached,
    });
  }

  /**
   * Record repo analysis metrics
   */
  recordRepoAnalysis(options: {
    success: boolean;
    duration: number;
    tokensUsed?: number;
    cached?: boolean;
  }): void {
    const { success, duration, tokensUsed, cached } = options;

    if (success) {
      this.observeHistogram('repo_analysis_duration_seconds', duration / 1000);

      if (tokensUsed) {
        this.incrementCounter('tokens_used_total', tokensUsed);

        if (cached) {
          this.incrementCounter('claude_cache_hits_total');
        } else {
          this.incrementCounter('claude_cache_misses_total');
          this.incrementCounter('claude_api_calls_total');
        }
      }
    }

    logger.debug('Recorded repo analysis metrics', {
      success,
      duration,
      tokensUsed,
      cached,
    });
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      counters: {},
      histograms: {},
    };

    // Add counters
    for (const [name, counter] of this.counters.entries()) {
      let total = 0;
      for (const value of counter.values.values()) {
        total += value;
      }
      summary.counters[name] = total;
    }

    // Add histograms
    for (const [name, histogram] of this.histograms.entries()) {
      summary.histograms[name] = this.getHistogramStats(name);
    }

    return summary;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const [name, counter] of this.counters.entries()) {
      lines.push(`# HELP ${name} ${counter.help}`);
      lines.push(`# TYPE ${name} counter`);

      for (const [labelsStr, value] of counter.values.entries()) {
        if (labelsStr === 'default') {
          lines.push(`${name} ${value}`);
        } else {
          const labels = JSON.parse(labelsStr);
          const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          lines.push(`${name}{${labelStr}} ${value}`);
        }
      }

      lines.push('');
    }

    // Export histograms (simplified - just count and sum)
    for (const [name, histogram] of this.histograms.entries()) {
      const stats = this.getHistogramStats(name);
      if (!stats) continue;

      lines.push(`# HELP ${name} ${histogram.help}`);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count ${stats.count}`);
      lines.push(`${name}_sum ${stats.sum}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.values.clear();
    }

    for (const histogram of this.histograms.values()) {
      histogram.values = [];
    }

    logger.info('Metrics reset');
  }
}

// Singleton instance
export const metricsService = new MetricsService();
