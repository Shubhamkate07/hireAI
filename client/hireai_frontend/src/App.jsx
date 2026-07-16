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

const App = () => {
  return (
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

        {/* Project Task: Jobs list with useQuery, pagination, filters, debounce */}
        <Route path="/jobs" element={<JobsListPage />} />

        {/* Project Task: Job detail page with useQuery(['job', id]) + Apply button */}
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  )
}

export default App