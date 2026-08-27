import { createContext, useContext, useState, useEffect } from 'react';
import api, { resetAuthState } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // L2 fix: only remove known app-owned keys, not every key in localStorage.
  // localStorage.clear() would delete third-party/iframe data sharing the same origin.
  const clearAppStorage = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('gam_cache')) localStorage.removeItem(key);
    });
  };

  // Bootstrap authentication on mount.
  // Priority 1: localStorage (fast path — already authenticated in this tab/session).
  // Priority 2: HttpOnly refresh cookie (handles Google OAuth redirect and cases
  //             where localStorage was cleared but the session is still valid).
  //             Calls /auth/refresh-token (cookie is sent automatically by the browser)
  //             to get a fresh access token, then /users/me to hydrate the user profile.
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');

    if (storedUser && storedToken) {
      // Fast path: already have a session in this tab
      setUser(JSON.parse(storedUser));
      setLoading(false);
      return;
    }

    // Slow path: try to recover session from HttpOnly refresh cookie.
    // This runs after a Google OAuth redirect (or if localStorage was cleared).
    const tryRefreshBootstrap = async () => {
      try {
        // Use api directly — /auth/refresh-token sends the HttpOnly cookie automatically.
        // The request interceptor allows it through because /auth/refresh-token is in
        // the public routes list and does not require an Authorization header.
        const refreshRes = await api.post('/auth/refresh-token');
        const newAccessToken = refreshRes.data?.data?.accessToken;
        if (!newAccessToken) throw new Error('No access token in refresh response');

        localStorage.setItem('accessToken', newAccessToken);
        resetAuthState();

        // Fetch the user profile now that we have a valid access token.
        const meRes = await api.get('/users/me');
        const userData = meRes.data?.data;
        if (!userData) throw new Error('No user data in /users/me response');

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } catch {
        // No valid refresh cookie — user is not authenticated. Stay logged-out silently.
        clearAppStorage();
      } finally {
        setLoading(false);
      }
    };

    tryRefreshBootstrap();
  }, []);

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    return data; // { message, data: { email } }
  };

  const verifyEmail = async (email, otp) => {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    return data;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    // L1 fix: guard against error-shape responses (e.g. unverified email returns
    // { unverified: true } with data.data = undefined, causing a TypeError on destructure)
    if (!data.data) {
      throw new Error(data.message || 'Login failed');
    }
    const { accessToken, ...userData } = data.data;
    clearAppStorage();
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // K1 fix: reset the api.js isRedirecting flag so future 401s redirect correctly
    resetAuthState();
    toast.success(`Welcome back, ${userData.name}!`);
    return userData;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    // L2 fix: only clear known app-owned keys
    clearAppStorage();
    // K1 fix: reset api.js auth state so the next login in the same tab works correctly
    resetAuthState();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, verifyEmail, resendVerification, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
