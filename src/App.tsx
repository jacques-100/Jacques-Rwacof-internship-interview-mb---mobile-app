import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Forbidden, NotFound, RequireAuth, RequireCapability } from '@/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState } from '@/components/states'
import { useFavicon } from '@/lib/useFavicon'
import { LoginPage } from '@/features/auth/LoginPage'
import { DeliveriesPage } from '@/features/deliveries/DeliveriesPage'
import { DeliveryDetailPage } from '@/features/deliveries/DeliveryDetailPage'
import { NewDeliveryPage } from '@/features/deliveries/NewDeliveryPage'
import { GradingPage, PaymentsPage } from '@/features/deliveries/QueuePage'
import { FarmerDetailPage } from '@/features/farmers/FarmerDetailPage'
import { FarmersPage } from '@/features/farmers/FarmersPage'
import { DailyIntakePage } from '@/features/intake/DailyIntakePage'
import { PricesPage } from '@/features/pricing/PricesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AuditLogsPage } from '@/features/audit/AuditLogsPage'
import { UsersPage } from '@/features/users/UsersPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { StationsPage } from '@/features/stations/StationsPage'

// The chart libraries are only needed on these two pages, so they load on demand.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))

export function App() {
  useFavicon()
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route element={<RequireCapability capability="createDeliveries" />}>
              <Route path="deliveries/new" element={<NewDeliveryPage />} />
            </Route>
            <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
            <Route path="farmers" element={<FarmersPage />} />
            <Route path="farmers/:id" element={<FarmerDetailPage />} />
            <Route path="grading" element={<GradingPage />} />
            <Route element={<RequireCapability capability="viewPayments" />}>
              <Route path="payments" element={<PaymentsPage />} />
            </Route>
            <Route path="daily-intake" element={<DailyIntakePage />} />
            <Route path="prices" element={<PricesPage />} />
            <Route element={<RequireCapability capability="viewReports" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RequireCapability capability="viewAudit" />}>
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
            <Route element={<RequireCapability capability="manageStations" />}>
              <Route path="stations" element={<StationsPage />} />
            </Route>
            <Route element={<RequireCapability capability="manageUsers" />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="forbidden" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
