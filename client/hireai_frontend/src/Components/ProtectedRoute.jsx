import { Navigate, Outlet } from 'react-router-dom'

const ProtectedRoute = () => {
    const isAuthenticated = true;

    console.log("Protected Route");
    console.log(isAuthenticated);

    return isAuthenticated
        ? <Outlet />
        : <Navigate to="/login" />
}

export default ProtectedRoute