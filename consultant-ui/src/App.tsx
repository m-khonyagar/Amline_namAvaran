import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ConsultantAuthProvider, useConsultantAuth } from './hooks/useConsultantAuth';
import ConsultantLayout from './layouts/ConsultantLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DossierPage from './pages/DossierPage';
import LeadsPage from './pages/LeadsPage';
import BenefitsPage from './pages/BenefitsPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useConsultantAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--amline-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Toaster richColors position="top-center" dir="rtl" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <ConsultantLayout />
            </Protected>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dossier" element={<DossierPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="benefits" element={<BenefitsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ConsultantAuthProvider>
      <AppRoutes />
    </ConsultantAuthProvider>
  );
}
