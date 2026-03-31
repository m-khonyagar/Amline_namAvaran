import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import UsersPage from './pages/users/UsersPage'
import UserDetailPage from './pages/users/UserDetailPage'
import AdsPage from './pages/ads/AdsPage'
import ContractsPage from './pages/contracts/ContractsPage'
import ContractDetailPage from './pages/contracts/ContractDetailPage'
import PRContractsPage from './pages/contracts/PRContractsPage'
import WalletsPage from './pages/wallets/WalletsPage'
import SettingsPage from './pages/settings/SettingsPage'
import CRMPage from './pages/crm/CRMPage'
import LeadDetailPage from './pages/crm/LeadDetailPage'
import { useAuth } from './hooks/useAuth'
import { PermissionGuard } from './components/auth/PermissionGuard'
import { ContractWizardPage } from './features/contract-wizard/ContractWizardPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <>
      <Toaster
        position="top-left"
        dir="rtl"
        toastOptions={{
          style: { background: '#333', color: '#fff' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="users">
            <Route index element={
              <PermissionGuard permission="users:read">
                <UsersPage />
              </PermissionGuard>
            } />
            <Route path=":id" element={
              <PermissionGuard permission="users:read">
                <UserDetailPage />
              </PermissionGuard>
            } />
          </Route>

          <Route path="ads">
            <Route index element={
              <PermissionGuard permission="ads:read">
                <AdsPage />
              </PermissionGuard>
            } />
          </Route>

          <Route path="contracts">
            <Route index element={
              <PermissionGuard permission="contracts:read">
                <ContractsPage />
              </PermissionGuard>
            } />
            <Route path=":id" element={
              <PermissionGuard permission="contracts:read">
                <ContractDetailPage />
              </PermissionGuard>
            } />
            <Route path="pr-contracts" element={
              <PermissionGuard permission="contracts:read">
                <PRContractsPage />
              </PermissionGuard>
            } />
            <Route path="wizard" element={
              <PermissionGuard permission="contracts:read">
                <ContractWizardPage platform="admin" />
              </PermissionGuard>
            } />
          </Route>

          <Route path="wallets">
            <Route index element={
              <PermissionGuard permission="wallets:read">
                <WalletsPage />
              </PermissionGuard>
            } />
          </Route>

          <Route path="settings" element={
            <PermissionGuard permission="settings:read">
              <SettingsPage />
            </PermissionGuard>
          } />

          <Route path="crm">
            <Route index element={<CRMPage />} />
            <Route path=":id" element={<LeadDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
