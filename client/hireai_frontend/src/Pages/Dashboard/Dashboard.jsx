import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice";

const Dashboard = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Read user directly from Redux store
    const user = useSelector((state) => state.auth.user);

    const handleLogout = async () => {
        await dispatch(logoutUser());
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
