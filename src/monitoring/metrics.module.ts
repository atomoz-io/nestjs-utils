import { MiddlewareConsumer, Module, NestModule, DynamicModule } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { BasicAuthMiddleware } from './auth.middleware';
import {
  resolverCallCounterProvider,
  resolverSuccessCounterProvider,
  resolverErrorCounterProvider,
  resolverExecutionTimeHistogramProvider,
} from './metrics';
import { MetricsService } from './metrics.service';

export interface MetricsModuleOptions {
  defaultMetrics?: boolean;
}

@Module({})
export class MetricsModule implements NestModule {
  constructor(private readonly options: MetricsModuleOptions = { defaultMetrics: true }) {}

  static register(options: MetricsModuleOptions = { defaultMetrics: true }): DynamicModule {
    return {
      module: MetricsModule,
      imports: [
        PrometheusModule.register({
          defaultMetrics: { enabled: options.defaultMetrics },
        }),
      ],
      providers: [
        MetricsService,
        resolverCallCounterProvider,
        resolverSuccessCounterProvider,
        resolverErrorCounterProvider,
        resolverExecutionTimeHistogramProvider,
      ],
      exports: [
        MetricsService,
        resolverCallCounterProvider,
        resolverSuccessCounterProvider,
        resolverErrorCounterProvider,
        resolverExecutionTimeHistogramProvider,
      ],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BasicAuthMiddleware).forRoutes('metrics');
  }
}
