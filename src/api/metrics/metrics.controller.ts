/**
 * Metrics Controller
 * Exposes Prometheus metrics and statistics
 */

import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get metrics in Prometheus format
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * Get metrics summary (JSON)
   */
  @Get('summary')
  getSummary() {
    return this.metricsService.getSummary();
  }

  /**
   * Get cache statistics
   */
  @Get('cache')
  async getCacheStats() {
    return await this.metricsService.getCacheStats();
  }
}
