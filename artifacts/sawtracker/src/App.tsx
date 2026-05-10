import { ReactNode, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import NotFound from './pages/not-found'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import AuthLoading from './components/AuthLoading'
import { useFontMode, useThemeMode } from './hooks/useUiPreferences'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

// Protected route layout with AppShell
function ProtectedRouteLayout() {
  const { session, user } = useAuth()

  return (
    <AuthLoading
      showError={false}
      maxWaitTime={12000}
      fallback={
        <PageLoader
          title="جاري فتح حسابك"
          description="نستعيد الجلسة ونجهز بيانات الصفحة بشكل آمن."
        />
      }
    >
      {session && user ? (
        <AppShell>
          <Outlet />
        </AppShell>
      ) : session ? (
        <PageLoader
          title="جاري تحميل بيانات المستخدم"
          description="نتحقق من صلاحياتك وبياناتك."
        />
      ) : (
        <Navigate to="/login" replace />
      )}
    </AuthLoading>
  )
}

// Lazy load all pages for code splitting
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Companies = lazy(() => import('./pages/Companies'))
const Projects = lazy(() => import('./pages/Projects'))
const TransferProcedures = lazy(() => import('./pages/TransferProcedures'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Reports = lazy(() => import('./pages/Reports'))
const PayrollDeductions = lazy(() => import('./pages/PayrollDeductions'))
const ImportExport = lazy(() => import('./pages/ImportExport'))
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'))
const GeneralSettings = lazy(() => import('./pages/GeneralSettings'))

// Loading fallback component
function PageLoader({
  title = 'جاري تجهيز التطبيق',
  description = 'نقوم الآن بالتحقق من الجلسة وتحميل البيانات الأساسية.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/80 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-900/90">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </div>
  )
}

// Helper component to wrap route components with ErrorBoundary and Suspense
function RouteGuard({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth()

  return (
    <AuthLoading
      showError={false}
      maxWaitTime={8000}
      fallback={
        <PageLoader
          title="جاري فتح صفحة الدخول"
          description="نتحقق من حالة الجلسة قبل عرض الصفحة المناسبة لك."
        />
      }
    >
      {session ? <Navigate to="/dashboard" replace /> : <>{children}</>}
    </AuthLoading>
  )
}

function AppRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <RouteGuard>
                <Login />
              </RouteGuard>
            </PublicRoute>
          }
        />

        {/* Protected routes with AppShell layout */}
        <Route element={<ProtectedRouteLayout />}>
          <Route
            path="/dashboard"
            element={
              <RouteGuard>
                <Dashboard />
              </RouteGuard>
            }
          />
          <Route
            path="/employees"
            element={
              <RouteGuard>
                <Employees />
              </RouteGuard>
            }
          />
          <Route
            path="/companies"
            element={
              <RouteGuard>
                <Companies />
              </RouteGuard>
            }
          />
          <Route
            path="/projects"
            element={
              <RouteGuard>
                <Projects />
              </RouteGuard>
            }
          />
          <Route
            path="/transfer-procedures"
            element={
              <RouteGuard>
                <TransferProcedures />
              </RouteGuard>
            }
          />
          <Route
            path="/advanced-search"
            element={
              <RouteGuard>
                <AdvancedSearch />
              </RouteGuard>
            }
          />
          <Route
            path="/users"
            element={<Navigate to="/admin-settings?tab=users-permissions" replace />}
          />
          <Route
            path="/settings"
            element={<Navigate to="/admin-settings?tab=users-permissions" replace />}
          />
          <Route
            path="/admin-settings"
            element={
              <RouteGuard>
                <GeneralSettings />
              </RouteGuard>
            }
          />
          <Route path="/backup-settings" element={<Navigate to="/admin-settings?tab=backup" replace />} />
          <Route path="/alert-settings" element={<Navigate to="/admin-settings?tab=alert-settings" replace />} />
          <Route
            path="/notifications"
            element={
              <RouteGuard>
                <Notifications />
              </RouteGuard>
            }
          />
          <Route
            path="/alerts"
            element={
              <RouteGuard>
                <Alerts />
              </RouteGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <RouteGuard>
                <Reports />
              </RouteGuard>
            }
          />
          <Route
            path="/payroll-deductions"
            element={
              <RouteGuard>
                <PayrollDeductions />
              </RouteGuard>
            }
          />
          <Route
            path="/activity-logs"
            element={<Navigate to="/admin-settings?tab=activity-logs" replace />}
          />
          <Route
            path="/import-export"
            element={
              <RouteGuard>
                <ImportExport />
              </RouteGuard>
            }
          />
          {/* Legacy redirects */}
          <Route path="/email-management" element={<Navigate to="/admin-settings?tab=backup" replace />} />
          <Route
            path="/system-correspondence"
            element={<Navigate to="/admin-settings?tab=backup" replace />}
          />
          <Route path="/centralized-settings" element={<Navigate to="/alert-settings" replace />} />
          <Route path="/security-management" element={<Navigate to="/admin-settings" replace />} />
          <Route path="/general-settings" element={<Navigate to="/admin-settings" replace />} />
          <Route
            path="/permissions"
            element={<Navigate to="/settings?tab=users-permissions" replace />}
          />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

function App() {
  useThemeMode()
  useFontMode()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
