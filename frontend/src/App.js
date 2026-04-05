import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider }         from './context/ToastContext';
import MainLayout      from './components/layout/MainLayout';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import ExpensesPage    from './pages/ExpensesPage';
import BudgetsPage     from './pages/BudgetsPage';
import RecurringPage   from './pages/RecurringPage';
import GoalsPage       from './pages/GoalsPage';
import SplitPage       from './pages/SplitPage';
import PredictionsPage from './pages/PredictionsPage';
import SettingsPage    from './pages/SettingsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="ef-splash">
      <div className="ef-spinner" />
      <p>Loading ExpenseFlow…</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"   element={<DashboardPage />} />
              <Route path="expenses"    element={<ExpensesPage />} />
              <Route path="budgets"     element={<BudgetsPage />} />
              <Route path="recurring"   element={<RecurringPage />} />
              <Route path="goals"       element={<GoalsPage />} />
              <Route path="split"       element={<SplitPage />} />
              <Route path="predictions" element={<PredictionsPage />} />
              <Route path="settings"    element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}