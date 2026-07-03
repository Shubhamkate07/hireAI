import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";
// import { loginUser } from "../../services/authService";
import { loginUser } from "../../store/slices/authSlice";
import { useDispatch } from "react-redux";
import "./Login.css";

function Login() {

    const navigate = useNavigate();

// const { login } = useAuth();

const dispatch = useDispatch();


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

   await dispatch(
    loginUser({
        email: formData.email,
        password: formData.password
    })
).unwrap();

    navigate("/dashboard");

} catch (rejectedValue) {

    // rejectedValue is the payload passed to rejectWithValue() in the thunk
    if (rejectedValue?.errors?.length > 0) {

        // Server returned structured field-level errors
        // Convert the array to { field: message } object
        const serverErrors = {};

        rejectedValue.errors.forEach(({ field, message }) => {
            serverErrors[field] = message;
        });

        setApiError(serverErrors);

    } else {

        // Generic error (invalid credentials, 500, network, etc.)
        setApiError({
            message: rejectedValue?.message || "Login failed"
        });
    }
}
    };

    return (
        <main className="auth-page">
            <div className="auth-bg" aria-hidden="true" />
            <div className="auth-grid" aria-hidden="true" />

            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-logo-icon" aria-hidden="true">🤖</div>
                    <span className="auth-logo-text">HireAI</span>
                </div>

                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-subtitle">Sign in to your account to continue</p>

                {apiError.message && (
                    <div className="api-error-banner" role="alert">
                        <span>⚠️</span>
                        <span>{apiError.message}</span>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="login-email" className="form-label">Email address</label>
                        <div className="input-wrapper">
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input${errors.email || apiError.email ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">✉️</span>
                        </div>
                        <p className="field-error">{errors.email || apiError.email}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password" className="form-label">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="login-password"
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`form-input${errors.password || apiError.password ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">🔒</span>
                        </div>
                        <p className="field-error">{errors.password || apiError.password}</p>
                    </div>

                    <button type="submit" className="btn-primary">
                        Login
                    </button>
                </form>

                <div className="auth-divider" />

                <p className="auth-footer">
                    Don't have an account? <Link to={'/register'}>Register</Link>
                </p>
            </div>
        </main>
    );
}

export default Login;
