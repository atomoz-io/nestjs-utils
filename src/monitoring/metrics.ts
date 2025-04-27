import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

export const resolverCallCounterProvider = makeCounterProvider({
  name: 'resolver_call_total',
  help: 'Total number of resolver calls',
  labelNames: ['resolver', 'type'],
});

export const resolverSuccessCounterProvider = makeCounterProvider({
  name: 'resolver_success_total',
  help: 'Total number of successful resolver calls',
  labelNames: ['resolver', 'type'],
});

export const resolverErrorCounterProvider = makeCounterProvider({
  name: 'resolver_error_total',
  help: 'Total number of resolver errors',
  labelNames: ['resolver', 'type'],
});

export const resolverExecutionTimeHistogramProvider = makeHistogramProvider({
  name: 'resolver_execution_duration_seconds',
  help: 'Duration of resolver execution in seconds',
  labelNames: ['resolver', 'type', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
