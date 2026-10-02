import { TOOLTIP_STYLE } from '@/components/chartStyle'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus } from 'lucide-react'
import { dashboardApi } from '@/api/dashboardApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { CapacityProgress } from '@/components/CapacityProgress'
import { DataTable } from '@/components/DataTable'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { STATUS_COLORS, STATUS_LABELS } from '@/components/StatusBadge'
import { ErrorState, LoadingState } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate, formatKg, formatNumber, formatRwf } from '@/lib/format'
import { compactColumns } from '../deliveries/deliveryColumns'
import { DeliveryCard } from '../deliveries/DeliveryCard'

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.dashboard(), queryFn: () => dashboardApi.get(), refetchInterval: 60_000 })

  const { user } = useAuth()
  const newDelivery = !can(user, 'createDeliveries') ? undefined : (
    <Link
      to="/deliveries/new"
      className="hidden h-9 items-center gap-2 rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700 lg:inline-flex"
    >
      <Plus className="size-4" aria-hidden="true" /> New delivery
    </Link>
  )

  if (isLoading) return <><PageHeader title="Dashboard" /><LoadingState label="Loading dashboard..." /></>
  if (error || !data) return <><PageHeader title="Dashboard" /><Card><ErrorState error={error} onRetry={() => void refetch()} /></Card></>

  const c = data.capacity
  const counts = c.statusCounts
  const trend = data.intakeTrend.map((t) => ({ ...t, label: formatDate(t.date).slice(0, 6) }))
  const distribution = data.statusDistribution
  const distributionTotal = distribution.reduce((sum, s) => sum + s.count, 0)

  return (
    <>
      <PageHeader title="Dashboard" description={`Station overview for ${formatDate(c.date)}`} actions={newDelivery} />

      {c.alert === 'FULL' && (
        <Alert tone="danger" className="mb-4" title="Daily intake capacity reached.">
          No more deliveries can be accepted for today unless a delivery is rejected.
        </Alert>
      )}
      {c.alert === 'LOW' && (
        <Alert tone="warning" className="mb-4" title="Daily intake capacity is nearly reached.">
          Only {formatKg(c.remainingKg)} of today's capacity remains.
        </Alert>
      )}

      <Card className="mb-5">
        <CardHeader title="Today's intake" description="Accepted weight against the daily station limit (rejected deliveries are excluded)." />
        <CardBody>
          <CapacityProgress
            acceptedKg={c.acceptedKg}
            limitKg={c.dailyLimitKg}
            remainingKg={c.remainingKg}
            utilizationPercent={c.utilizationPercent}
            alert={c.alert}
            size="lg"
          />
        </CardBody>
      </Card>

      <section aria-label="Key figures" className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Today's deliveries" value={formatNumber(c.totalDeliveries)} />
        <MetricCard label="Received" value={formatNumber(counts.RECEIVED)} accent={STATUS_COLORS.RECEIVED} hint="Awaiting grading" />
        <MetricCard label="Graded" value={formatNumber(counts.GRADED)} accent={STATUS_COLORS.GRADED} hint="Awaiting payment" />
        <MetricCard label="Paid" value={formatNumber(counts.PAID)} accent={STATUS_COLORS.PAID} />
        <MetricCard label="Rejected" value={formatNumber(counts.REJECTED)} accent={STATUS_COLORS.REJECTED} hint={formatKg(c.rejectedKg)} />
        <MetricCard label="Total amount paid" value={formatRwf(c.totalAmountPaid)} />
      </section>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily intake" description="Accepted kg over the last 7 days" />
          <CardBody>
            <div role="img" aria-label={`Bar chart of accepted kilograms per day for the last 7 days. ${trend.map((t) => `${t.label}: ${formatKg(t.acceptedKg)}`).join('; ')}. Daily limit ${formatKg(c.dailyLimitKg)}.`} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stone-200)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} axisLine={{ stroke: 'var(--color-stone-300)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} axisLine={false} width={48} domain={[0, Math.max(c.dailyLimitKg, ...trend.map((t) => t.acceptedKg))]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatKg(v), 'Accepted']} cursor={{ fill: 'var(--color-stone-100)' }} />
                  <ReferenceLine y={c.dailyLimitKg} stroke="var(--color-red-600)" strokeDasharray="4 4" label={{ value: 'Daily limit', position: 'insideTopRight', fontSize: 11, fill: '#b91c1c' }} />
                  <Bar dataKey="acceptedKg" fill="var(--color-brand-600)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Accepted kilograms per day</caption>
              <thead><tr><th>Date</th><th>Accepted kg</th></tr></thead>
              <tbody>{trend.map((t) => <tr key={t.date}><td>{formatDate(t.date)}</td><td>{t.acceptedKg}</td></tr>)}</tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Delivery status" description="Today's deliveries by status" />
          <CardBody>
            {distributionTotal === 0 ? (
              <p className="py-10 text-center text-sm text-stone-600">No deliveries recorded today.</p>
            ) : (
              <>
                <div role="img" aria-label={`Status distribution: ${distribution.map((s) => `${STATUS_LABELS[s.status]} ${s.count}`).join(', ')}`} className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="count" nameKey="status" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
                        {distribution.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, _n, item) => [v, STATUS_LABELS[item.payload.status as keyof typeof STATUS_LABELS]]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {distribution.map((s) => (
                    <li key={s.status} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                        {STATUS_LABELS[s.status]}
                      </span>
                      <span className="tabular font-medium">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent deliveries" description="Latest deliveries recorded at the station" actions={<Link to="/deliveries" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">View all</Link>} />
        <DataTable
          caption="Recent deliveries"
          columns={compactColumns()}
          mobileCard={(d) => <DeliveryCard delivery={d} />}
          rows={data.recentDeliveries}
          rowKey={(d) => d.id}
          emptyTitle="No deliveries yet"
          emptyDescription="Deliveries you record will appear here."
          emptyAction={newDelivery}
          mobileTitle={(d) => d.reference}
        />
      </Card>
    </>
  )
}
