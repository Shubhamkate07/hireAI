import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {

    const {
        isAuthenticated,
        loading
    } = useAuth();

    if (loading) {
        return <h1>Loading...</h1>;
    }

    return isAuthenticated
        ? <Outlet />
        : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
