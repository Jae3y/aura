import * as Sentry from '@sentry/nextjs';
import { config } from './lib/config';

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    
    // Performance Monitoring
    tracesSampleRate: 1.0,
    
    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Environment
    environment: process.env.NODE_ENV,
    
    beforeSend(event, hint) {
      // Filter out wallet-related errors that are expected
      if (event.exception?.values?.[0]?.value?.includes('User rejected')) {
        return null;
      }
      return event;
    },
  });
}
