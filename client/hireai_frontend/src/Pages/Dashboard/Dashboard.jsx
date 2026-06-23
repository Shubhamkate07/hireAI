import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {

    const { user, logout } = useAuth();

    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();

        navigate("/login");
    };

    return (
        <div>

            <h1>
                Welcome, {user?.name}
            </h1>

            <p>
                Role: {user?.role}
            </p>

            <button onClick={handleLogout}>
                Logout
            </button>

            <Link to={'/profile'}>Profile</Link>

        </div>
    );
};

export default Dashboard;
