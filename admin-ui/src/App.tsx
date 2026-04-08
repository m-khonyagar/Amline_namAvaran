import { Routes, Route, Navigate, Link } from 'react-router-dom'
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
import LegalReviewQueuePage from './pages/contracts/LegalReviewQueuePage'
import WalletsPage from './pages/wallets/WalletsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import SettingsPage from './pages/settings/SettingsPage'
import RolesPage from './pages/admin/RolesPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import ActivityReportPage from './pages/admin/ActivityReportPage'
import IntegrationsPage from './pages/integrations/IntegrationsPage'
import BillingPage from './pages/billing/BillingPage'
import CRMPage from './pages/crm/CRMPage'
import LeadDetailPage from './pages/crm/LeadDetailPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import { useAuth } from './hooks/useAuth'
import { PermissionGuard } from './components/auth/PermissionGuard'
import { ContractWizardPage } from './features/contract-wizard/ContractWizardPage'
import type { ReactNode } from 'react'
import { ThemeProvider } from './theme/ThemeProvider'
import { useTheme } from './theme/useTheme'
import LocalTestHubPage from './pages/dev/LocalTestHubPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      position="top-left"
      dir="rtl"
      theme={resolved === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        classNames: {
          toast:
            resolved === 'dark'
              ? 'bg-slate-900 text-slate-100 border border-slate-700'
              : 'bg-white text-slate-900 border border-slate-200',
        },
      }}
    />
  )
}

function AppRoutes() {
  return (
    <>
      <ThemedToaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {import.meta.env.DEV ? (
          <Route
            path="/dev/test-hub"
            element={
              <div
                dir="rtl"
                className="min-h-screen bg-[var(--amline-bg)] px-4 py-8 text-[var(--amline-fg)] sm:px-8"
              >
                <LocalTestHubPage />
              </div>
            }
          />
        ) : null}

        {import.meta.env.DEV ? (
          <Route
            path="/dev/preview/user-wizard"
            element={
              <ProtectedRoute>
                <div dir="rtl" className="min-h-screen bg-[var(--amline-bg)] text-[var(--amline-fg)]">
                  <header className="sticky top-0 z-10 border-b border-[var(--amline-border)] bg-[var(--amline-surface)]/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                    <div className="container-amline flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--amline-fg-muted)]">
                        پیش‌نمایش: ویزارد با نقش کاربر عادی (بدون سایدبار ادمین)
                      </p>
                      <Link
                        to="/dev/test-hub"
                        className="text-sm font-semibold text-[var(--amline-primary)] hover:underline"
                      >
                        ← هاب تست لوکال
                      </Link>
                    </div>
                  </header>
                  <div className="container-amline py-6">
                    <ContractWizardPage platform="user" />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        ) : null}

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
            <Route path="legal-queue" element={
              <PermissionGuard permission="legal:read">
                <LegalReviewQueuePage />
              </PermissionGuard>
            } />
            <Route path="wizard" element={
              <PermissionGuard permission="contracts:write">
                <ContractWizardPage platform="admin" />
              </PermissionGuard>
            } />
            <Route path="pr-contracts" element={
              <PermissionGuard permission="contracts:read">
                <PRContractsPage />
              </PermissionGuard>
            } />
            <Route path=":id" element={
              <PermissionGuard permission="contracts:read">
                <ContractDetailPage />
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

          <Route path="payments">
            <Route index element={
              <PermissionGuard permission="wallets:read">
                <PaymentsPage />
              </PermissionGuard>
            } />
          </Route>

          <Route path="billing" element={
            <PermissionGuard permission="wallets:read">
              <BillingPage />
            </PermissionGuard>
          } />

          <Route path="settings" element={
            <PermissionGuard permission="settings:read">
              <SettingsPage />
            </PermissionGuard>
          } />

          <Route path="integrations" element={
            <PermissionGuard permission="settings:read">
              <IntegrationsPage />
            </PermissionGuard>
          } />

          <Route path="admin/roles" element={
            <PermissionGuard permission="roles:read">
              <RolesPage />
            </PermissionGuard>
          } />
          <Route path="admin/audit" element={
            <PermissionGuard permission="audit:read">
              <AuditLogPage />
            </PermissionGuard>
          } />
          <Route path="admin/activity" element={
            <PermissionGuard permission="reports:read">
              <ActivityReportPage />
            </PermissionGuard>
          } />

          <Route path="notifications" element={
            <PermissionGuard permission="notifications:read">
              <NotificationsPage />
            </PermissionGuard>
          } />

          <Route path="crm">
            <Route index element={
              <PermissionGuard permission="crm:read">
                <CRMPage />
              </PermissionGuard>
            } />
            <Route path=":id" element={
              <PermissionGuard permission="crm:read">
                <LeadDetailPage />
              </PermissionGuard>
            } />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  )
}

export default App
