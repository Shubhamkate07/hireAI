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
    const [apiError, setApiError] = useState({});


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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear all previous errors on every new submit attempt
        setApiError({});
        setErrors({});

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

try {

    await login(
        formData.email,
        formData.password
    );

    navigate("/dashboard");

} catch (error) {

    const data = error.response?.data;

    if (data?.errors?.length > 0) {

        // Server returned structured field-level errors
        // Convert the array to { field: message } object
        const serverErrors = {};

        data.errors.forEach(({ field, message }) => {
            serverErrors[field] = message;
        });

        setApiError(serverErrors);

    } else {

        // Generic error (invalid credentials, 500, network, etc.)
        setApiError({
            message: data?.message || "Login failed"
        });
    }
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
            <p>{errors.email || apiError.email}</p>

            <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                />
            <p>{errors.password || apiError.password}</p>

          

            <button type="submit">
                Login
            </button>
        </form>

        <p>{apiError.message}</p>

        <Link to={'/register'}>Register</Link>
                </>
    );
}

export default Login;
