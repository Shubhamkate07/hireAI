import { Routes, Route } from 'react-router-dom'

import Login from './Pages/Login/Login'
import Register from './Pages/Register/Register'
import Dashboard from './Pages/Dashboard/Dashboard'
import Profile from './Pages/Profile/Profile'
import NotFound from './Pages/NotFound/NotFound'

// ─── New pages ────────────────────────────────────────────────────────────────
import PracticePage  from './Pages/Practice/PracticePage'       // Exercises 2 & 3
import JobsListPage  from './Pages/JobsListPage/JobsListPage'   // Project Task: list
import JobDetailPage from './Pages/JobDetailPage/JobDetailPage' // Project Task: detail

import ProtectedRoute from './Components/ProtectedRoute'

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches any render-time JS errors thrown inside wrapped subtrees.
// Prevents a single broken component from crashing the whole app.
// Must be a class component — the getDerivedStateFromError API has no hooks
// equivalent.
import ErrorBoundary from './Components/ErrorBoundary'

const App = () => {
  return (
    /**
     * Top-level ErrorBoundary — last resort safety net.
     * Catches any uncaught render error in the entire app tree that isn't
     * already caught by a closer boundary.
     */
    <ErrorBoundary>
      <Routes>

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public: React Query practice exercises */}
        <Route path="/practice" element={<PracticePage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          {/* Project Task: Jobs list — wrapped in its own ErrorBoundary so
              a crash here shows the fallback UI, not a blank page. */}
          <Route
            path="/jobs"
            element={
              <ErrorBoundary>
                <JobsListPage />
              </ErrorBoundary>
            }
          />

          {/* Project Task: Job detail page with Apply flow */}
          <Route
            path="/jobs/:id"
            element={
              <ErrorBoundary>
                <JobDetailPage />
              </ErrorBoundary>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </ErrorBoundary>
  )
}

export default App