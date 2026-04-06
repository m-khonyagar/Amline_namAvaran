import { lazy, Suspense, type ReactNode } from 'react'
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
import RolesPage from './pages/admin/RolesPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import ActivityReportPage from './pages/admin/ActivityReportPage'
import ConsultantsReviewPage from './pages/consultants/ConsultantsReviewPage'
import WorkspacePage from './pages/workspace/WorkspacePage'
import CRMPage from './pages/crm/CRMPage'
import NotificationsInboxPage from './pages/admin/NotificationsInboxPage'
import HamgitPortLayout from './pages/hamgit-port/HamgitPortLayout'
import HamgitPortHubPage from './pages/hamgit-port/HamgitPortHubPage'
import {
  HamgitAdsAdvancedPage,
  HamgitClausesPage,
  HamgitInvoicesPage,
  HamgitMarketPage,
  HamgitPromoPage,
  HamgitRequirementsPage,
  HamgitSettlementsPage,
  HamgitWalletToolsPage,
} from './pages/hamgit-port/HamgitSectionPages'
import { useAuth } from './hooks/useAuth'
import { PermissionGuard } from './components/auth/PermissionGuard'
import { featureEnabled } from './lib/featureFlags'
import { ThemeProvider } from './theme/ThemeProvider'
import { useTheme } from './theme/useTheme'

const ContractWizardPage = lazy(async () => {
  const m = await import('./features/contract-wizard/ContractWizardPage')
  return { default: m.ContractWizardPage }
})

const LeadDetailPage = lazy(() => import('./pages/crm/LeadDetailPage'))

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20" role="status" aria-busy="true" aria-label="در حال بارگذاری">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-400" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

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
            <Route
              index
              element={
                <PermissionGuard permission="users:read">
                  <UsersPage />
                </PermissionGuard>
              }
            />
            <Route
              path=":id"
              element={
                <PermissionGuard permission="users:read">
                  <UserDetailPage />
                </PermissionGuard>
              }
            />
          </Route>

          <Route path="ads">
            <Route
              index
              element={
                <PermissionGuard permission="ads:read">
                  <AdsPage />
                </PermissionGuard>
              }
            />
          </Route>

          <Route path="contracts">
            <Route
              index
              element={
                <PermissionGuard permission="contracts:read">
                  <ContractsPage />
                </PermissionGuard>
              }
            />
            <Route
              path=":id"
              element={
                <PermissionGuard permission="contracts:read">
                  <ContractDetailPage />
                </PermissionGuard>
              }
            />
            {featureEnabled('PR_CONTRACTS_PAGE') ? (
              <Route
                path="pr-contracts"
                element={
                  <PermissionGuard permission="contracts:read">
                    <PRContractsPage />
                  </PermissionGuard>
                }
              />
            ) : null}
            <Route
              path="wizard"
              element={
                <PermissionGuard permission="contracts:write">
                  <RouteSuspense>
                    <ContractWizardPage platform="admin" />
                  </RouteSuspense>
                </PermissionGuard>
              }
            />
          </Route>

          <Route path="wallets">
            <Route
              index
              element={
                <PermissionGuard permission="wallets:read">
                  <WalletsPage />
                </PermissionGuard>
              }
            />
          </Route>

          <Route
            path="settings"
            element={
              <PermissionGuard permission="settings:read">
                <SettingsPage />
              </PermissionGuard>
            }
          />

          <Route
            path="admin/inbox"
            element={
              <PermissionGuard permission="notifications:read">
                <NotificationsInboxPage />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/roles"
            element={
              <PermissionGuard permission="roles:read">
                <RolesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/audit"
            element={
              <PermissionGuard permission="audit:read">
                <AuditLogPage />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/activity"
            element={
              <PermissionGuard permission="reports:read">
                <ActivityReportPage />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/consultants"
            element={
              <PermissionGuard permission="consultants:read">
                <ConsultantsReviewPage />
              </PermissionGuard>
            }
          />
          <Route
            path="admin/workspace"
            element={
              <PermissionGuard permission="workspace:read">
                <WorkspacePage />
              </PermissionGuard>
            }
          />

          {featureEnabled('HAMGIT_PORT') ? (
            <Route
              path="admin/hamgit-port"
              element={
                <PermissionGuard permission="settings:read">
                  <HamgitPortLayout />
                </PermissionGuard>
              }
            >
              <Route index element={<HamgitPortHubPage />} />
              <Route path="requirements" element={<HamgitRequirementsPage />} />
              <Route path="ads" element={<HamgitAdsAdvancedPage />} />
              <Route path="settlements" element={<HamgitSettlementsPage />} />
              <Route path="invoices" element={<HamgitInvoicesPage />} />
              <Route path="clauses" element={<HamgitClausesPage />} />
              <Route path="promo" element={<HamgitPromoPage />} />
              <Route path="market" element={<HamgitMarketPage />} />
              <Route path="wallet-tools" element={<HamgitWalletToolsPage />} />
            </Route>
          ) : null}

          <Route path="crm">
            <Route
              index
              element={
                <PermissionGuard permission="crm:read">
                  <CRMPage />
                </PermissionGuard>
              }
            />
            <Route
              path=":id"
              element={
                <PermissionGuard permission="crm:read">
                  <RouteSuspense>
                    <LeadDetailPage />
                  </RouteSuspense>
                </PermissionGuard>
              }
            />
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
