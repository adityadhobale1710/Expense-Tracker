import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { GamificationProvider } from './context/GamificationContext';
import { ThemeProvider } from './context/ThemeContext';
import XPAnimation from './components/gamification/XPAnimation';
import LevelUpModal from './components/gamification/LevelUpModal';
import RewardChestModal from './components/gamification/RewardChestModal';
import NotificationToast from './components/gamification/NotificationToast';
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
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Income = lazy(() => import('./pages/Income/Income'));
const Expenses = lazy(() => import('./pages/Expenses/Expenses'));
const Budget = lazy(() => import('./pages/Budget/Budget'));
const Reports = lazy(() => import('./pages/Reports/Reports'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const BillCalendar = lazy(() => import('./pages/Calendar/BillCalendar'));
const AIAssistant = lazy(() => import('./pages/AIAssistant/AIAssistant'));
const Achievements = lazy(() => import('./pages/Achievements/Achievements'));
const Loans = lazy(() => import('./pages/Loans/Loans'));
const Wallets = lazy(() => import('./pages/Wallets/Wallets'));
const Subscriptions = lazy(() => import('./pages/Subscriptions/Subscriptions'));
const SplitBills = lazy(() => import('./pages/Split/SplitBills'));
const FamilySharing = lazy(() => import('./pages/Family/FamilySharing'));
const AnalyticsPro = lazy(() => import('./pages/Analytics/AnalyticsPro'));
const AdminPortal = lazy(() => import('./pages/Admin/AdminPortal'));
const GoalsDashboard = lazy(() => import('./pages/Goals/GoalsDashboard'));
const GoalDetails = lazy(() => import('./pages/Goals/GoalDetails'));

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

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-900">
    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// AdminRoute \u2014 UX guard only. The real security boundary is the backend middleware.
// Unauthenticated \u2192 /login, authenticated non-admin \u2192 /dashboard, admin \u2192 renders.
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="income" element={<Income />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="budget" element={<Budget />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="calendar" element={<BillCalendar />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="loans" element={<Loans />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="split-bills" element={<SplitBills />} />
        <Route path="family" element={<FamilySharing />} />
        <Route path="analytics-pro" element={<AnalyticsPro />} />
        <Route path="admin-portal" element={<AdminRoute><AdminPortal /></AdminRoute>} />
        <Route path="goals" element={<GoalsDashboard />} />
        <Route path="goals/:id" element={<GoalDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

import { DialogProvider } from './context/DialogContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <GamificationProvider>
              <ExpenseProvider>
                <DialogProvider>
                  <AppRoutes />
                  {/* Global gamification overlays — rendered once at root */}
                  <XPAnimation />
                  <LevelUpModal />
                  <RewardChestModal />
                  <NotificationToast />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      style: { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' },
                      success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
                    }}
                  />
                </DialogProvider>
              </ExpenseProvider>
            </GamificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
