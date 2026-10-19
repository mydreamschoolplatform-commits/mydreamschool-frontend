// Centralized API Configuration
// This enables switching between localhost and production via .env
const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
export const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
export const IMAGE_BASE_URL = (import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');

export const getApiUrl = (endpoint) => {
    // Ensure endpoint doesn't double slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};
