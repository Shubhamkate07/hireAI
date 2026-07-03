import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";
import {useDispatch} from 'react-redux'
import { registerUser } from "../../store/slices/authSlice";
import "../Login/Login.css";
import "./Register.css";

function Register() {

    const navigate = useNavigate();

    // const { register } = useAuth();

    const dispatch = useDispatch();

    const [apiError, setApiError] = useState({});

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "candidate"
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        } else if (formData.name.length < 2) {
            newErrors.name = "Name must be at least 2 characters";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Confirm password is required";
        } else if (
            formData.password !== formData.confirmPassword
        ) {
            newErrors.confirmPassword =
                "Passwords do not match";
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
    registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role
    })
).unwrap();
            navigate("/login");

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

                // Generic error (email already exists, 500, network, etc.)
                setApiError({
                    message: rejectedValue?.message || "Registration failed. Please try again."
                });
            }
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-bg" aria-hidden="true" />
            <div className="auth-grid" aria-hidden="true" />

            <div className="auth-card auth-card--register">
                <div className="auth-brand">
                    <div className="auth-logo-icon" aria-hidden="true">🤖</div>
                    <span className="auth-logo-text">HireAI</span>
                </div>

                <h1 className="auth-title">Create your account</h1>
                <p className="auth-subtitle">Join HireAI and supercharge your hiring</p>

                {apiError.message && (
                    <div className="api-error-banner" role="alert">
                        <span>⚠️</span>
                        <span>{apiError.message}</span>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="reg-name" className="form-label">Full name</label>
                        <div className="input-wrapper">
                            <input
                                id="reg-name"
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`form-input${errors.name || apiError.name ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">👤</span>
                        </div>
                        <p className="field-error">{errors.name || apiError.name}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-email" className="form-label">Email address</label>
                        <div className="input-wrapper">
                            <input
                                id="reg-email"
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input${errors.email || apiError.email ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">✉️</span>
                        </div>
                        <p className="field-error">{errors.email || apiError.email}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-password" className="form-label">Password</label>
                        <div className="input-wrapper">
                            <input
                                id="reg-password"
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`form-input${errors.password || apiError.password ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">🔒</span>
                        </div>
                        <p className="field-error">{errors.password || apiError.password}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-confirm-password" className="form-label">Confirm password</label>
                        <div className="input-wrapper">
                            <input
                                id="reg-confirm-password"
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`form-input${errors.confirmPassword || apiError.confirmPassword ? " input-error" : ""}`}
                            />
                            <span className="input-icon" aria-hidden="true">✅</span>
                        </div>
                        <p className="field-error">{errors.confirmPassword || apiError.confirmPassword}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-role" className="form-label">Role</label>
                        <div className="select-wrapper">
                            <select
                                id="reg-role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="form-select no-icon"
                            >
                                <option value="candidate">Candidate</option>
                                <option value="recruiter">Recruiter</option>
                                <option value="admin">Admin</option>
                            </select>
                            <span className="select-arrow" aria-hidden="true">▼</span>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary">
                        Register
                    </button>
                </form>

                <div className="auth-divider" />

                <p className="auth-footer">
                    Already have an account? <Link to={'/login'}>Login</Link>
                </p>
            </div>
        </main>
    );
}

export default Register;
