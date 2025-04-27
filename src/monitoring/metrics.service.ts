import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  private static _instance: MetricsService;

  constructor(
    @InjectMetric('resolver_execution_duration_seconds')
    public readonly executionDurationHistogram: Histogram<string>,
    @InjectMetric('resolver_call_total')
    public readonly callCounter: Counter<string>,
    @InjectMetric('resolver_success_total')
    public readonly successCounter: Counter<string>,
    @InjectMetric('resolver_error_total')
    public readonly errorCounter: Counter<string>,
  ) {
    console.log('MetricsService instantiated');
    MetricsService._instance = this;
  }

  public static get instance(): MetricsService {
    return MetricsService._instance;
  }

  public static set instance(value: MetricsService) {
    MetricsService._instance = value;
  }
}
