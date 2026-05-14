import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'
import { initializeSecurity } from './utils/securityIntegration'

if (!import.meta.env.DEV) {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  if (sentryDsn) {
    const isStaging = import.meta.env.MODE === 'staging'
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      // replays فقط في staging لتجنب تسجيل بيانات حقيقية في production
      replaysSessionSampleRate: isStaging ? 0.1 : 0,
      replaysOnErrorSampleRate: isStaging ? 1.0 : 0,
      integrations: isStaging ? [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })] : [],
      // حجب PII — لا نُرسل البريد أو عنوان IP
      beforeSend(event) {
        if (event.user) {
          delete event.user.email
          delete event.user.ip_address
        }
        return event
      },
    })
  }
}

initializeSecurity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
