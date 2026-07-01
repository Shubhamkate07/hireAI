import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = () => {

    const { isAuthenticated, loading } = useSelector((state) => state.auth);

    // Wait for checkAuth() (called in main.jsx) to finish before deciding
    if (loading) {
        return <h1>Loading...</h1>;
    }

    return isAuthenticated
        ? <Outlet />
        : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
