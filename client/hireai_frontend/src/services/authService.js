import api from "./api";

// Accepts a single credentials object: { email, password }
export const loginUser = (credentials) => {
    return api.post("/auth/login", credentials);
};

// Accepts a single user object: { name, email, password, confirmPassword, role }
export const registerUser = (userData) => {
    return api.post("/auth/register", userData);
};

export const logoutUser = () => {
    return api.post("/auth/logout");
};

export const getCurrentUser = () => {
    return api.get("/auth/me");
};