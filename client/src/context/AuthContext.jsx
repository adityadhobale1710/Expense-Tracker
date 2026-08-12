import { createContext, useContext, useState, useEffect } from 'react';
import api, { resetAuthState } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // L2 fix: only remove known app-owned keys, not every key in localStorage.
  // localStorage.clear() would delete third-party/iframe data sharing the same origin.
  const clearAppStorage = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('gam_cache')) localStorage.removeItem(key);
    });
  };

  const register = async (name, email, password, phone) => {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    return data; // { message, data: { email } }
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
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
