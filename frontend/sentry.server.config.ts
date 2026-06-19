import * as Sentry from '@sentry/nextjs';
import { config } from './lib/config';

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    
    // Performance Monitoring
    tracesSampleRate: 1.0,
    
    // Environment
    environment: process.env.NODE_ENV,
  });
}
