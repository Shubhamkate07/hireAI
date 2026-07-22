import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import ErrorBoundary  from './Components/ErrorBoundary'
import PageLoader     from './Components/PageLoader'
// ProtectedRoute is NOT lazy — it's a layout wrapper that must be available
// immediately to check auth state before any protected page renders.
import ProtectedRoute from './Components/ProtectedRoute'

// ─── What is React.lazy? ───────────────────────────────────────────────────────
//
// React.lazy(() => import('./SomePage')) does TWO things:
//
//   1. At BUILD TIME (Vite/Webpack):
//      The bundler sees the dynamic import() and creates a SEPARATE .js file
//      (called a "chunk") for that component. It is NOT included in the main
//      bundle that downloads when the user first opens the app.
//
//   2. At RUNTIME (in the browser):
//      The component's chunk only downloads when React first needs to render it.
//      If the user never visits /profile, that chunk is never downloaded.
//
// BEFORE (static import — everything in one big bundle):
//   import Dashboard from './Pages/Dashboard/Dashboard'
//
// AFTER (lazy — each page gets its own chunk, downloaded on demand):
//   const Dashboard = React.lazy(() => import('./Pages/Dashboard/Dashboard'))
//
// ─────────────────────────────────────────────────────────────────────────────

const Login        = lazy(() => import('./Pages/Login/Login'))
const Register     = lazy(() => import('./Pages/Register/Register'))
const Dashboard    = lazy(() => import('./Pages/Dashboard/Dashboard'))
const Profile      = lazy(() => import('./Pages/Profile/Profile'))
const NotFound     = lazy(() => import('./Pages/NotFound/NotFound'))
const PracticePage = lazy(() => import('./Pages/Practice/PracticePage'))
const JobsListPage = lazy(() => import('./Pages/JobsListPage/JobsListPage'))
const JobDetailPage = lazy(() => import('./Pages/JobDetailPage/JobDetailPage'))
const AssessmentPage = lazy(() => import('./Pages/Assessment/AssessmentPage'))

const App = () => {
  return (
    /**
     * Top-level ErrorBoundary — last resort safety net.
     * Catches any uncaught render error in the entire app tree that isn't
     * already caught by a closer boundary.
     *
     * NOTE: ErrorBoundary also catches lazy-loading failures (e.g. user is
     * offline and the chunk can't download). Without it you'd get a blank page.
     */
    <ErrorBoundary>

      {/*
       * ── What is Suspense? ─────────────────────────────────────────────────
       *
       * When React tries to render a lazy component whose chunk hasn't arrived
       * yet, it "suspends" — it pauses rendering and looks UP the tree for the
       * nearest <Suspense> boundary.
       *
       * <Suspense fallback={<PageLoader />}> says:
       *   "While any lazy child is loading, show <PageLoader /> instead."
       *
       * Once the chunk arrives, React swaps out PageLoader and renders the real page.
       *
       * ── WHY wrap <Routes> here? ───────────────────────────────────────────
       * Wrapping the entire <Routes> block in one Suspense covers ALL routes
       * automatically. Navigating to any lazy page will show the same spinner.
       * This is the simplest, highest-ROI approach.
       */}
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Public Routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public: React Query practice exercises */}
          <Route path="/practice" element={<PracticePage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile"   element={<Profile />} />

            {/* Jobs list */}
            <Route
              path="/jobs"
              element={
                <ErrorBoundary>
                  <JobsListPage />
                </ErrorBoundary>
              }
            />

            {/* Job detail */}
            <Route
              path="/jobs/:id"
              element={
                <ErrorBoundary>
                  <JobDetailPage />
                </ErrorBoundary>
              }
            />

            {/*
             * ── Nested Suspense (Exercise 5) ──────────────────────────────
             *
             * AssessmentPage gets its OWN Suspense boundary in addition to the
             * top-level one. This means you can show a DIFFERENT fallback just
             * for this route — e.g. "Preparing your assessment..." instead of
             * the generic spinner.
             *
             * When React suspends here, it finds THIS boundary first (closest
             * ancestor wins), so the outer Suspense's fallback is never shown
             * for this route. That's the power of nested Suspense.
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

          {/* 404 */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App