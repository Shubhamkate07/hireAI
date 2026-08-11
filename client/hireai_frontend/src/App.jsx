/**
 * ============================================================
 * App.jsx — Route configuration with production-ready
 *           Suspense + ErrorBoundary on every lazy route
 * ============================================================
 *
 * EXERCISE 2 — Why BOTH Suspense AND ErrorBoundary on every route?
 *
 * React.lazy() splits the component into a separate JS chunk.
 * Two distinct failure modes exist:
 *
 *   1. Chunk is DOWNLOADING (normal case):
 *      Suspense catches the Promise thrown by React.lazy and renders
 *      the fallback (<PageLoader />) until the chunk arrives.
 *      Without Suspense → React crashes with "A React component suspended
 *      while rendering but no fallback UI was provided."
 *
 *   2. Chunk FAILS to download (network error, 404, CDN outage):
 *      React.lazy() throws a render error (not a Promise).
 *      ErrorBoundary catches this and shows a recoverable fallback UI.
 *      Without ErrorBoundary → the thrown error propagates up to the
 *      nearest boundary (the root one), crashing the ENTIRE app.
 *      A chunk error on /jobs should never crash /dashboard.
 *
 * PATTERN: ErrorBoundary(outer) wraps Suspense(inner) wraps Component.
 *   ErrorBoundary must be OUTSIDE Suspense. If Suspense is outside,
 *   the boundary can't catch errors that happen while Suspense is pending.
 *
 * OUTER Suspense + ErrorBoundary (lines 76-78):
 *   A safety net for anything not individually wrapped.
 *   Catches errors/loading at the router level.
 *
 * PER-ROUTE Suspense + ErrorBoundary (each <Route>):
 *   Localises errors — one route failing doesn't affect others.
 *   Shows per-route loading shimmer, not a full-page blank.
 * ============================================================
 */
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import ErrorBoundary  from './Components/ErrorBoundary'
import PageLoader     from './Components/PageLoader'
import ProtectedRoute from './Components/ProtectedRoute'

// ─── Lazy-loaded page components ─────────────────────────────────────────────
// Each is split into its own JS chunk. The browser downloads them on demand.
const Login                 = lazy(() => import('./Pages/Login/Login'))
const Register              = lazy(() => import('./Pages/Register/Register'))
const Dashboard             = lazy(() => import('./Pages/Dashboard/Dashboard'))
const Profile               = lazy(() => import('./Pages/Profile/Profile'))
const NotFound              = lazy(() => import('./Pages/NotFound/NotFound'))
const PracticePage          = lazy(() => import('./Pages/Practice/PracticePage'))
const JobsListPage          = lazy(() => import('./Pages/JobsListPage/JobsListPage'))
const JobDetailPage         = lazy(() => import('./Pages/JobDetailPage/JobDetailPage'))
const AssessmentPage        = lazy(() => import('./Pages/Assessment/AssessmentPage'))
const RecruiterDashboardPage = lazy(() => import('./Pages/Recruiter/RecruiterDashboardPage'))
const ApplicantPipelinePage  = lazy(() => import('./Pages/Recruiter/ApplicantPipelinePage'))
const AnalyticsDashboard     = lazy(() => import('./Pages/Recruiter/AnalyticsDashboard'))
const AdminDashboard         = lazy(() => import('./Pages/Admin/AdminDashboard'))

// ─── Helper: route element with Suspense + ErrorBoundary ─────────────────────
// Extracts the repetitive wrapping pattern into a single call.
// ErrorBoundary(outer) > Suspense(inner) > Component — this order is required.
const routeEl = (Component, label = 'page') => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
)

const App = () => {
  return (
    // Root ErrorBoundary — last-resort catch for anything not individually wrapped
    <ErrorBoundary>
      {/* Root Suspense — safety net while the router itself initialises */}
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public Routes ─────────────────────────────────────────── */}
          <Route path="/login"    element={routeEl(Login)} />
          <Route path="/register" element={routeEl(Register)} />

          {/* Practice exercises */}
          <Route path="/practice" element={routeEl(PracticePage)} />

          {/* ── Standard Protected Routes ─────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={routeEl(Dashboard)} />
            <Route path="/profile"   element={routeEl(Profile)} />

            {/* Jobs list */}
            <Route path="/jobs"    element={routeEl(JobsListPage)} />

            {/* Job detail */}
            <Route path="/jobs/:id" element={routeEl(JobDetailPage)} />

            {/*
              Assessment — keeps a custom Suspense fallback message
              to avoid the generic "Loading…" during assessment prep
            */}
            <Route
              path="/assessments/:assessmentId"
              element={
                <ErrorBoundary>
                  <Suspense fallback={
                    <div className="page-loader-wrap">
                      <div className="page-loader-spinner" role="status" aria-label="Loading assessment..." />
                      <p className="page-loader-text">Preparing your assessment...</p>
                    </div>
                  }>
                    <AssessmentPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>

          {/* ── Recruiter Role-Protected Routes ───────────────────────── */}
          <Route element={<ProtectedRoute requiredRole="recruiter" />}>
            <Route path="/recruiter/dashboard"            element={routeEl(RecruiterDashboardPage)} />
            <Route path="/recruiter/jobs/:jobId/pipeline" element={routeEl(ApplicantPipelinePage)} />
            <Route path="/recruiter/analytics"            element={routeEl(AnalyticsDashboard)} />
          </Route>

          {/* ── Admin Role-Protected Route ────────────────────────────── */}
          {/* SECURITY Layer 1: ProtectedRoute requiredRole="admin"       */}
          {/* SECURITY Layer 2: rbacMiddleware(['admin']) on every endpoint */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={routeEl(AdminDashboard)} />
          </Route>

          {/* 404 */}
          <Route path="*" element={routeEl(NotFound)} />

        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App