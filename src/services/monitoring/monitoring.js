import * as Sentry from '@sentry/react';
import { SENTRY_DSN } from './sentryConfig.js';

let started = false;

// Only real builds report, so local development and both test suites stay out of the Sentry quota.
export function initMonitoring() {
  if (started || !import.meta.env.PROD) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    release: `18komputer@${import.meta.env.VITE_APP_VERSION}`,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // Release health pings every screen change, which is a lot of traffic on a phone for something
    // this app does not look at. Errors are the point.
    integrations: (defaults) => defaults.filter((one) => one.name !== 'BrowserSession')
  });
  Sentry.setTag('source', 'browser');
  started = true;
}

export function reportProblem(problem, { level = 'error', ...context } = {}) {
  if (!started) return;
  Sentry.captureException(problem, { level, extra: context });
}
