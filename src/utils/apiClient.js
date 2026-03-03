import axios from 'axios';

// Get API URL from env and ensure no trailing /api (since endpoints include it)
let apiUrl = import.meta.env.VITE_API_URL || '';
if (apiUrl && apiUrl.endsWith('/api')) {
    apiUrl = apiUrl.slice(0, -4);
}

// Create a configured instance
const apiClient = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to attach token to every request
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

import { showToast } from './toast';

// Interceptor to handle 401/403 errors (Token expiry)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || 'A network error occurred';

        if (status === 401) {
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            showToast('Session expired. Please log in again.', 'error');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        } else if (status >= 400 && status < 500) {
            // Suppress unauth toasts on login page to avoid double UI
            if (!window.location.pathname.includes('/login')) {
                showToast(message, 'error');
            } else if (status !== 401 && status !== 400 && status !== 404) {
                showToast(message, 'error');
            }
        } else if (status >= 500) {
            showToast('Server error. Please try again later.', 'error');
        } else if (!error.response && error.message !== 'canceled') {
            showToast('Network error. Please check your connection.', 'error');
        }
        return Promise.reject(error);
    }
);

export default apiClient;
