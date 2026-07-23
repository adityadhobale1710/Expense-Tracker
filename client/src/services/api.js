import axios from 'axios';
import toast from 'react-hot-toast';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Auto Token Refresh and Global Error Handling
// Issue #6 fix: module-level semaphore prevents race condition where concurrent
// 401 errors each trigger their own /refresh-token call (token rotation failure).
let refreshingPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Handle Token Refresh on 401 Unauthorized
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      originalRequest._retry = true; // Retry only once
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        // Serialize all concurrent refresh attempts — only one call to /refresh-token
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(`${API_URL}/auth/refresh-token`, { refreshToken })
            .then((res) => res.data.data)
            .finally(() => { refreshingPromise = null; });
        }

        const tokens = await refreshingPromise;
        const newAccessToken = tokens.accessToken;
        const newRefreshToken = tokens.refreshToken;

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear storage and force logout
        refreshingPromise = null;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 2. Global Error Handling
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message || 'An error occurred';
      const isAuthRoute = originalRequest.url?.includes('/auth/');

      if (!isAuthRoute) {
        switch (status) {
          case 403:
            toast.error('Forbidden: You do not have permission to perform this action.');
            break;
          case 404:
            // Silent log to prevent popup spam for normal 404 route checks if any
            console.warn(`Resource not found: ${originalRequest.url}`);
            break;
          case 429:
            toast.error('Too many requests. Please slow down and try again later.');
            break;
          case 500:
            toast.error('Internal Server Error. Please contact support or try again later.');
            break;
          case 503:
            toast.error('Service Unavailable. The server is temporarily overloaded or down.');
            break;
          default:
            // Other client errors can be handled downstream, log them here
            console.error(`API Error [${status}]:`, message);
        }
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please check your internet connection.');
    } else {
      toast.error('Network Error. Unable to connect to the backend server.');
    }

    return Promise.reject(error);
  }
);

export default api;
