import * as Sentry from "@sentry/node";

// Placeholder configuration until a real DSN is set in .env
const DSN = process.env.SENTRY_DSN || "";

if (DSN) {
    Sentry.init({
        dsn: DSN,
        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        environment: process.env.NODE_ENV || 'development'
    });
} else {
    console.warn('⚠️ Sentry DSN not provided. Crash reporting is disabled.');
}
