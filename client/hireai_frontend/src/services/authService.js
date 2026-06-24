import api from "./api";

export const loginUser = (email, password) => {
    return api.post("/auth/login", {
        email,
        password
    });
};

export const registerUser = (
    name,
    email,
    password,
    confirmPassword,
    role
) => {
    return api.post("/auth/register", {
        name,
        email,
        password,
        confirmPassword,
        role
    });
};

export const logoutUser = () => {
    return api.post("/auth/logout");
};

export const getCurrentUser = () => {
    return api.get("/auth/me");
};