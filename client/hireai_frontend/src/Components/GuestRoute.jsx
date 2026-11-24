/**
 * GuestRoute.jsx — Wraps /login and /register.
 * Already-signed-in users are sent to /dashboard instead of seeing the login form again.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const GuestRoute = () => {
    const { isAuthenticated, loading } = useSelector((state) => state.auth);
    if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
};

export default GuestRoute;
