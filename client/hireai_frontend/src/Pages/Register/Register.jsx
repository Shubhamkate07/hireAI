import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Register() {

    const navigate = useNavigate();

    const { register } = useAuth();

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

        // const validationErrors = validate();

        // setErrors(validationErrors);

        // if (Object.keys(validationErrors).length > 0) {
        //     return;
        // }

        try {

            await register(
                formData.name,
                formData.email,
                formData.password,
                formData.confirmPassword,
                formData.role
            );

            navigate("/login");

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

                // Generic error (email already exists, 500, network, etc.)
                setApiError({
                    message: data?.message || "Registration failed. Please try again."
                });
            }
        }
    };

    return (
        <>
          
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
            />
            <p>{errors.name || apiError.name}</p>

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

            <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
            />
            <p>{errors.confirmPassword || apiError.confirmPassword}</p>

            <select
                name="role"
                value={formData.role}
                onChange={handleChange}
            >
                <option value="candidate">
                    Candidate
                </option>

                <option value="recruiter">
                    Recruiter
                </option>

                <option value="admin">
                    Admin
                </option>
            </select>

            <button type="submit">
                Register
            </button>
        </form>
      
        <p>{apiError.message}</p>

        <Link to={'/login'}>Login</Link>
            </>

    );
}

export default Register;
