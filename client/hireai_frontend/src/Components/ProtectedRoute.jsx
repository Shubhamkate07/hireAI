import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * Extended ProtectedRoute component with requiredRole support.
 *
 * Scenarios handled:
 *   1. Loading: waits for session check to complete before making decision
 *   2. Not logged in (!isAuthenticated): redirects to /login
 *   3. Wrong role (requiredRole && user?.role !== requiredRole): redirects to /dashboard
 *   4. Authorized: renders child routes via <Outlet />
 */
const ProtectedRoute = ({ requiredRole }) => {
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

    if (loading) {
        return (
            <div className="page-loader-wrap">
                <div className="page-loader-spinner" role="status" aria-label="Loading session..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
