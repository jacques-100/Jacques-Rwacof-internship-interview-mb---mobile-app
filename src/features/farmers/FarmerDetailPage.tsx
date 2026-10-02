import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiError } from '@/api/client'
import { farmerApi } from '@/api/farmerApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { DataTable } from '@/components/DataTable'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate, formatKg, formatNumber, formatRwf } from '@/lib/format'
import { compactColumns } from '../deliveries/deliveryColumns'
import { DeliveryCard } from '../deliveries/DeliveryCard'
import { FarmerFormDialog } from './FarmerFormDialog'

export function FarmerDetailPage() {
  const { user } = useAuth()
  const id = Number(useParams().id)
  const [editing, setEditing] = useState(false)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.farmer(id), queryFn: () => farmerApi.get(id), enabled: Number.isFinite(id) })

  const back = (
    <Link to="/farmers" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> All farmers
    </Link>
  )

  if (isLoading) return <LoadingState label="Loading farmer..." />
  if (error || !data) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <div className="mb-4">{back}</div>
        <Card>
          <ErrorState error={error} title={notFound ? 'Farmer not found' : 'Could not load this farmer'} onRetry={notFound ? undefined : () => void refetch()} />
        </Card>
      </>
    )
  }

  const f = data.farmer

  return (
    <>
      <div className="mb-3">{back}</div>
      <PageHeader title={f.fullName} description={`Cooperative number ${f.cooperativeNumber}`} actions={can(user, 'manageFarmers') ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit farmer</Button> : undefined} />

      <section aria-label="Delivery totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total deliveries" value={formatNumber(f.totalDeliveries)} />
        <MetricCard label="Total kg delivered" value={formatKg(f.totalWeightKg)} hint="Excludes rejected deliveries" />
        <MetricCard label="Total amount paid" value={formatRwf(f.totalAmountPaid)} />
        <MetricCard label="Status" value={f.active ? 'Active' : 'Inactive'} />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <Fact label="Full name" value={f.fullName} />
              <Fact label="Phone" value={f.phone} />
              <Fact label="Cooperative no." value={f.cooperativeNumber} />
              <Fact label="Registered" value={formatDate(f.createdAt)} />
            </dl>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent deliveries"
            description="Latest 10 deliveries"
            actions={<Link to={`/deliveries?farmerId=${f.id}`} className="text-sm font-medium text-brand-700 hover:underline">Full delivery history</Link>}
          />
          <DataTable
            caption={`Recent deliveries for ${f.fullName}`}
            columns={compactColumns({ actions: false })}
          mobileCard={(d) => <DeliveryCard delivery={d} actions={false} />}
            rows={data.recentDeliveries}
            rowKey={(d) => d.id}
            emptyTitle="No deliveries yet"
            emptyDescription="This farmer has not delivered any cherries."
            mobileTitle={(d) => d.reference}
          />
        </Card>
      </div>

      {editing && <FarmerFormDialog farmer={f} open onClose={() => setEditing(false)} />}
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}
