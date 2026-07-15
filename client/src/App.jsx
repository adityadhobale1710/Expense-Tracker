import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes cache stale
    },
  },
});

import Layout from './components/common/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Income from './pages/Income/Income';
import Expenses from './pages/Expenses/Expenses';
import Budget from './pages/Budget/Budget';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import BillCalendar from './pages/Calendar/BillCalendar';
import AIInsights from './pages/AIInsights/AIInsights';
import Achievements from './pages/Achievements/Achievements';
import Loans from './pages/Loans/Loans';
import Subscriptions from './pages/Subscriptions/Subscriptions';
import SplitBills from './pages/Split/SplitBills';
import FamilySharing from './pages/Family/FamilySharing';
import AIAssistant from './pages/AIAssistant/AIAssistant';
import AnalyticsPro from './pages/Analytics/AnalyticsPro';
import AdminPortal from './pages/Admin/AdminPortal';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="income" element={<Income />} />
      <Route path="expenses" element={<Expenses />} />
      <Route path="budget" element={<Budget />} />
      <Route path="reports" element={<Reports />} />
      <Route path="profile" element={<Profile />} />
      <Route path="calendar" element={<BillCalendar />} />
      <Route path="ai-insights" element={<AIInsights />} />
      <Route path="achievements" element={<Achievements />} />
      <Route path="loans" element={<Loans />} />
      <Route path="subscriptions" element={<Subscriptions />} />
      <Route path="split-bills" element={<SplitBills />} />
      <Route path="family" element={<FamilySharing />} />
      <Route path="ai-assistant" element={<AIAssistant />} />
      <Route path="analytics-pro" element={<AnalyticsPro />} />
      <Route path="admin-portal" element={<AdminPortal />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ExpenseProvider>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' },
                  success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
                }}
              />
            </ExpenseProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
