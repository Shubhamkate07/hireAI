import {
    createContext,
    useState,
    useEffect,
    useContext
} from "react";

import {
    loginUser,
    registerUser,
    logoutUser,
    getCurrentUser
} from "../services/authService";

import {
    setLogoutHandler
} from "../services/authEvent";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore user on refresh
    useEffect(() => {
        checkAuth();
    }, []);

    // Register logout handler
    useEffect(() => {
        setLogoutHandler(logout);
    }, []);

    const checkAuth = async () => {
        try {
            const response =
                await getCurrentUser();

            setUser(response.data.data);

        } catch (error) {
            setUser(null);

        } finally {
            setLoading(false);
        }
    };

    const login = async (
        email,
        password
    ) => {
        try {
            setLoading(true);

            const response =
                await loginUser(
                    email,
                    password
                );

            setUser(response.data.data.user);

            return response.data;

        } finally {
            setLoading(false);
        }
    };

    const register = async (
        name,
        email,
        password,
        role
    ) => {
        try {
            setLoading(true);

            const response =
                await registerUser(
                    name,
                    email,
                    password,
                    role
                );

            return response.data;

        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutUser();

        } catch (error) {
            console.log(error);

        } finally {
            setUser(null);
        }
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated,
                login,
                register,
                logout,
                checkAuth
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
