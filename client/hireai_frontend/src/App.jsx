import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import ErrorBoundary  from './Components/ErrorBoundary'
import PageLoader     from './Components/PageLoader'
import ProtectedRoute from './Components/ProtectedRoute'

// Lazy-loaded page components
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

const App = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Public Routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Practice exercises */}
          <Route path="/practice" element={<PracticePage />} />

          {/* Standard Protected Routes (authenticated candidates, recruiters, admins) */}
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

            {/* Nested Suspense for Assessment */}
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

          {/* Recruiter Role-Protected Routes (Exercise 4) */}
          <Route element={<ProtectedRoute requiredRole="recruiter" />}>
            <Route
              path="/recruiter/dashboard"
              element={
                <ErrorBoundary>
                  <RecruiterDashboardPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/recruiter/jobs/:jobId/pipeline"
              element={
                <ErrorBoundary>
                  <ApplicantPipelinePage />
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