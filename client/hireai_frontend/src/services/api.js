import axios from "axios";
import { triggerLogout } from "./authEvent";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    // NOTE: Do NOT set a default Content-Type here.
    // Axios sets it automatically per request:
    //   • Plain object body  → application/json
    //   • FormData body      → multipart/form-data; boundary=<generated>
    // Hardcoding "application/json" here would strip the boundary string
    // from FormData requests, breaking multipart parsing on the server.
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
