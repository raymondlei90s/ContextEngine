/**
 * Metrics Service (API)
 * Provides metrics data to the API endpoints
 */

import { Injectable } from '@nestjs/common';
import { metricsService } from '../../services/metrics.js';
import { claudeCache } from '../../services/claude-cache.js';

@Injectable()
export class MetricsService {
  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    return metricsService.exportPrometheus();
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return metricsService.getSummary();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await claudeCache.getStats();
  }
}
