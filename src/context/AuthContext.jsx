import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../utils/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    // Basic expiry check
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Token valid, set basic info first
                        setUser(decoded);

                        // Fetch full profile (essential since token no longer has big image)
                        try {
                            const res = await apiClient.get('/api/profile');
                            // Merge token data with fresh db data
                            setUser(prev => ({ ...prev, ...res.data }));
                        } catch (fetchErr) {
                            console.error("Failed to fetch full profile on init:", fetchErr);
                            // Fallback to token data (already set), user might see broken image until they re-login or refresh if really broken
                        }
                    }
                } catch (error) {
                    console.error("Invalid token:", error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // Session Timeout Logic (1 Hour Inactivity)
    useEffect(() => {
        if (!user) return; // Only track if logged in

        const TIMEOUT_MS = 60 * 60 * 1000; // 1 Hour
        let lastActivity = Date.now();

        const handleActivity = () => {
            lastActivity = Date.now();
        };

        // Track user activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Check for inactivity every minute
        const intervalId = setInterval(() => {
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                console.log("Session timed out due to inactivity.");
                logout();
            }
        }, 60000);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            clearInterval(intervalId);
        };
    }, [user]);

    const login = async (username, password) => {
        try {
            const res = await apiClient.post('/api/auth/login', { username, password });

            const { token, role, username: dbUsername, fullName, profileImage, class: studentClass, medium } = res.data;

            if (token) {
                localStorage.setItem('token', token);
                const decoded = jwtDecode(token);
                // Merge decoded token data with full user details from response (including profileImage)
                setUser({ ...decoded, ...res.data });
                return { success: true, role };
            }
            return { success: false, message: 'No token received' };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Login failed',
                status: error.response?.status || 'Network Error'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
