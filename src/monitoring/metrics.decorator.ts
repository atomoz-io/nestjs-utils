import { performance } from 'perf_hooks';

import { MetricsService } from './metrics.service';
import { ResponseStatus } from 'src/responses/response.enum';

export interface MonitorOptions {
  type: 'query' | 'mutation';
}

export function TrackMetrics(options: MonitorOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const resolverName = propertyKey;
    const resolverType = options.type;
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!MetricsService.instance) {
        return originalMethod.apply(this, args);
      }

      MetricsService.instance.callCounter.inc({
        resolver: resolverName,
        type: resolverType,
      });

      const startTime = performance.now();
      let statusLabel: 'SUCCESS' | 'ERROR' = 'SUCCESS';

      try {
        const result = await originalMethod.apply(this, args);
        if (result && result.status === ResponseStatus.ERROR) {
          MetricsService.instance.errorCounter.inc({
            resolver: resolverName,
            type: resolverType,
          });
          statusLabel = 'ERROR';
        } else {
          MetricsService.instance.successCounter.inc({
            resolver: resolverName,
            type: resolverType,
          });
        }
        return result;
      } catch (error) {
        MetricsService.instance.errorCounter.inc({
          resolver: resolverName,
          type: resolverType,
        });
        statusLabel = 'ERROR';
        throw error;
      } finally {
        const duration = (performance.now() - startTime) / 1000;
        MetricsService.instance.executionDurationHistogram.observe(
          { resolver: resolverName, type: resolverType, status: statusLabel },
          duration,
        );
      }
    };
    return descriptor;
  };
}
