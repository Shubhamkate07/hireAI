import axios from "axios";
import { triggerLogout } from "./authEvent";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.response.use(
    response => response,

    error => {
        const url = error.config?.url;

        const ignoreRoutes = [
           "/auth/me",
            "/auth/login",
            "/auth/register",
            "/auth/logout",
            "/auth/refresh-token"
        ];

        if (
            error.response?.status === 401 &&
            !ignoreRoutes.includes(url)
        ) {
            triggerLogout();
        }

        return Promise.reject(error);
    }
);

export default api;
