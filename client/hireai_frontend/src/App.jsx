import { Routes, Route } from 'react-router-dom'

import Login from './Pages/Login/Login'
import Register from './Pages/Register/Register'
import Dashboard from './Pages/Dashboard/Dashboard'
import Profile from './Pages/Profile/Profile'
import NotFound from './Pages/NotFound/NotFound'

import ProtectedRoute from './Components/ProtectedRoute'

const App = () => {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  )
}

export default App