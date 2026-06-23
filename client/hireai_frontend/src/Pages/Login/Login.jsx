import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Login() {


    const navigate = useNavigate();

const { login } = useAuth();


    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState("");


    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        }

        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        }

        return newErrors;
    };

    const handleSubmit =  async(e) => {
        e.preventDefault();

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

try {

    setApiError("");

    await login(
        formData.email,
        formData.password
    );

    navigate("/dashboard");

} catch (error) {

    setApiError(
        error.response?.data?.message ||
        "Login failed"
    );
}
    };

    return (
        <>
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                />
            <p>{errors.email}</p>

            <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                />
            <p>{errors.password}</p>

          

            <button type="submit">
                Login
            </button>
        </form>

        <p>{apiError}</p>

        <Link to={'/register'}>Register</Link>
                </>
    );
}

export default Login;
