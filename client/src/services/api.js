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

// Request Interceptor: Attach Access Token & Guard Unauthenticated Requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    // Check if route is a protected backend endpoint
    const isPublicRoute = config.url?.includes('/auth/login') ||
                          config.url?.includes('/auth/register') ||
                          config.url?.includes('/auth/verify-registration-otp') ||
                          config.url?.includes('/auth/resend-registration-otp') ||
                          config.url?.includes('/auth/forgot-password') ||
                          config.url?.includes('/auth/reset-password');
                          
    if (!isPublicRoute && !token) {
      // Abort/Cancel request locally to prevent repeated failing 401 calls
      return Promise.reject(new axios.Cancel('Request aborted: missing authentication token.'));
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Timezone-Offset'] = new Date().getTimezoneOffset();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Auto Token Refresh and Global Error Handling
let refreshingPromise = null;
let isRedirecting = false;

// K1 fix: exported so AuthContext can reset the flag after a successful login
// (without this, a session expiry followed by re-login in the same SPA tab
// leaves isRedirecting = true permanently, preventing future 401 redirects)
export const resetAuthState = () => {
  isRedirecting = false;
  refreshingPromise = null;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If request was canceled, bypass global error prompts
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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
        // Serialize all concurrent refresh attempts — only one call to /refresh-token
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true })
            .then((res) => res.data.data)
            .finally(() => { refreshingPromise = null; });
        }

        const tokens = await refreshingPromise;
        const newAccessToken = tokens.accessToken;

        localStorage.setItem('accessToken', newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // K2 fix: null refreshingPromise BEFORE clearing storage so any concurrent
        // requests that are waiting on the old promise do not enter an inconsistent state.
        refreshingPromise = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('gam_cache')) {
            localStorage.removeItem(key);
          }
        });
        
        if (!isRedirecting) {
          isRedirecting = true;
          window.location.replace('/login');
        }
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
