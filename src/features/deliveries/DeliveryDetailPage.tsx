import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { deliveryApi } from '@/api/deliveryApi'
import { qk } from '@/api/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorState, LoadingState } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ApiError } from '@/api/client'
import { formatDate, formatDateTime, formatKg, formatRwf, formatTime } from '@/lib/format'
import type { Delivery } from '@/lib/types'
import { DeliveryActions } from './DeliveryActions'

export function DeliveryDetailPage() {
  const id = Number(useParams().id)
  const delivery = useQuery({ queryKey: qk.delivery(id), queryFn: () => deliveryApi.get(id), enabled: Number.isFinite(id) })
  const audit = useQuery({ queryKey: qk.deliveryAudit(id), queryFn: () => deliveryApi.audit(id), enabled: Number.isFinite(id) })

  const back = (
    <Link to="/deliveries" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> All deliveries
    </Link>
  )

  if (delivery.isLoading) return <LoadingState label="Loading delivery..." />
  if (delivery.error || !delivery.data) {
    const notFound = delivery.error instanceof ApiError && delivery.error.status === 404
    return (
      <>
        <div className="mb-4">{back}</div>
        <Card>
          <ErrorState error={delivery.error} title={notFound ? 'Delivery not found' : 'Could not load this delivery'} onRetry={notFound ? undefined : () => void delivery.refetch()} />
        </Card>
      </>
    )
  }

  const d = delivery.data

  return (
    <>
      <div className="mb-3">{back}</div>
      <PageHeader
        title={`Delivery ${d.reference}`}
        description={`${d.farmer.fullName} · ${formatDate(d.deliveryDate)}`}
        actions={
          <>
            <StatusBadge status={d.status} className="px-3 py-1 text-sm" />
            <DeliveryActions delivery={d} size="md" />
          </>
        }
      />

      {d.status === 'REJECTED' && (
        <Alert tone="danger" className="mb-5" title="This delivery was rejected and can no longer be changed.">
          Reason: {d.rejectReason}
        </Alert>
      )}
      {d.status === 'PAID' && (
        <Alert tone="success" className="mb-5" title="This delivery has been paid and can no longer be changed." />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Farmer information">
          <Fact label="Name" value={<Link to={`/farmers/${d.farmer.id}`} className="font-medium text-brand-700 hover:underline">{d.farmer.fullName}</Link>} />
          <Fact label="Phone" value={d.farmer.phone} />
          <Fact label="Cooperative number" value={d.farmer.cooperativeNumber} />
        </Section>

        <Section title="Delivery information">
          <Fact label="Reference" value={d.reference} />
          <Fact label="Delivery date" value={formatDate(d.deliveryDate)} />
          <Fact label="Weight" value={formatKg(d.weightKg)} />
          <Fact label="Created by" value={d.createdBy} />
          <Fact label="Created at" value={formatDateTime(d.createdAt)} />
        </Section>

        <Section title="Grading">
          <GradingFacts d={d} />
        </Section>

        <Section title={d.status === 'REJECTED' ? 'Rejection' : 'Payment'}>
          {d.status === 'REJECTED' ? (
            <>
              <Fact label="Reason" value={d.rejectReason} />
              <Fact label="Rejected by" value={d.rejectedBy} />
              <Fact label="Rejected at" value={formatDateTime(d.rejectedAt)} />
            </>
          ) : (
            <>
              <Fact label="Payment status" value={d.status === 'PAID' ? 'Paid' : d.status === 'GRADED' ? 'Awaiting payment' : 'Not yet graded'} />
              <Fact label="Amount" value={d.amountOwed != null ? formatRwf(d.amountOwed) : '-'} />
              <Fact label="Paid by" value={d.paidBy ?? '-'} />
              <Fact label="Paid at" value={d.paidAt ? formatDateTime(d.paidAt) : '-'} />
            </>
          )}
        </Section>
      </div>

      <Card className="mt-5">
        <CardHeader title="Audit history" description="Every important action on this delivery, oldest first." />
        <CardBody>
          {audit.isLoading && <LoadingState label="Loading history..." />}
          {audit.error && <ErrorState error={audit.error} onRetry={() => void audit.refetch()} title="Could not load history" />}
          {audit.data && (
            <ol className="relative space-y-5 border-l border-stone-200 pl-6">
              {audit.data.map((entry) => (
                <li key={entry.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                  <p className="text-xs text-stone-500">
                    <time dateTime={entry.occurredAt}>{formatTime(entry.occurredAt)}</time> · {formatDate(entry.occurredAt)} · {entry.username}
                  </p>
                  <p className="text-sm font-medium text-stone-900">{entry.description}</p>
                  {typeof entry.details?.reason === 'string' && <p className="text-sm text-stone-600">Reason: {entry.details.reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </>
  )
}

function GradingFacts({ d }: { d: Delivery }) {
  if (!d.grade) {
    return <p className="text-sm text-stone-600">{d.status === 'REJECTED' ? 'Rejected deliveries are not graded.' : 'This delivery has not been graded yet.'}</p>
  }
  return (
    <>
      <Fact label="Grade" value={`Grade ${d.grade}`} />
      <Fact label="Price per kg (at grading)" value={formatRwf(d.pricePerKg)} />
      <Fact label="Amount owed" value={<strong>{formatRwf(d.amountOwed)}</strong>} />
      <Fact label="Graded by" value={d.gradedBy} />
      <Fact label="Graded at" value={formatDateTime(d.gradedAt)} />
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <dl className="space-y-3">{children}</dl>
      </CardBody>
    </Card>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <dt className="text-stone-600">{label}</dt>
      <dd className="tabular col-span-2 text-stone-900">{value ?? '-'}</dd>
    </div>
  )
}
