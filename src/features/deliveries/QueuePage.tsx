import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { deliveryApi } from '@/api/deliveryApi'
import { gradeApi } from '@/api/gradeApi'
import { qk } from '@/api/queryKeys'
import { DataTable } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { FilterPanel } from '@/components/FilterPanel'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { useSearchState } from '@/lib/useSearchState'
import type { DeliveryFilters, DeliveryStatus } from '@/lib/types'
import { useFarmerOptions } from '../farmers/useFarmerOptions'
import { compactColumns } from './deliveryColumns'
import { DeliveryCard } from './DeliveryCard'

interface QueuePageProps {
  title: string
  description: string
  status: DeliveryStatus
  emptyTitle: string
  emptyDescription: string
  /** Grade is only a useful filter once deliveries have one. */
  filterByGrade?: boolean
}

const FILTER_KEYS = ['q', 'farmerId', 'grade', 'from', 'to']

/** A work queue: every delivery in one status, oldest first so nothing waits unnoticed. */
function QueuePage({ title, description, status, emptyTitle, emptyDescription, filterByGrade = false }: QueuePageProps) {
  const s = useSearchState()
  const farmers = useFarmerOptions()
  const grades = useQuery({ queryKey: qk.grades(false), queryFn: () => gradeApi.list(false), staleTime: 60_000, enabled: filterByGrade })

  const filters: DeliveryFilters = {
    status,
    q: s.get('q'),
    farmerId: s.get('farmerId') ? Number(s.get('farmerId')) : '',
    grade: s.get('grade'),
    from: s.get('from'),
    to: s.get('to'),
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 20),
    sortBy: 'createdAt',
    dir: 'asc',
  }
  const activeCount = FILTER_KEYS.filter((k) => s.get(k) !== '').length
  const invalidRange = filters.from && filters.to && filters.from > filters.to

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.deliveries(filters),
    queryFn: () => deliveryApi.list(filters),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  })

  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <SearchInput value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Reference, farmer, phone..." />
          <SelectField label="Farmer" value={s.get('farmerId')} onChange={(e) => s.set({ farmerId: e.target.value })}>
            <option value="">All farmers</option>
            {farmers.data?.content.map((f) => <option key={f.id} value={f.id}>{f.fullName} ({f.cooperativeNumber})</option>)}
          </SelectField>
          {filterByGrade && (
            <SelectField label="Grade" value={s.get('grade')} onChange={(e) => s.set({ grade: e.target.value })}>
              <option value="">Any grade</option>
              {grades.data?.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </SelectField>
          )}
          <DatePicker label="Delivered from" value={s.get('from')} max={s.get('to') || undefined} onChange={(v) => s.set({ from: v })} />
          <DatePicker label="Delivered until" value={s.get('to')} min={s.get('from') || undefined} onChange={(v) => s.set({ to: v })} error={invalidRange ? 'End date is before start date' : undefined} />
        </FilterPanel>
        {data && (
          <p className="border-b border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 sm:px-5" aria-live="polite">
            {data.totalElements} {data.totalElements === 1 ? 'delivery' : 'deliveries'} waiting{activeCount > 0 ? ' (filtered)' : ''}
          </p>
        )}
        <DataTable
          caption={title}
          columns={compactColumns()}
          mobileCard={(d) => <DeliveryCard delivery={d} />}
          rows={invalidRange ? [] : data?.content}
          rowKey={(d) => d.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No deliveries match these filters' : emptyTitle}
          emptyDescription={activeCount > 0 ? 'Try widening or resetting the filters.' : emptyDescription}
          pagination={data && !invalidRange ? data : undefined}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(d) => d.reference}
        />
      </Card>
    </>
  )
}

export function GradingPage() {
  return (
    <QueuePage
      title="Grading"
      description="Received deliveries waiting to be graded or rejected, oldest first."
      status="RECEIVED"
      emptyTitle="Nothing waiting to be graded"
      emptyDescription="New deliveries appear here as soon as they are received."
    />
  )
}

export function PaymentsPage() {
  return (
    <QueuePage
      title="Payments"
      description="Graded deliveries waiting for payment to the farmer, oldest first."
      status="GRADED"
      emptyTitle="No payments are waiting"
      emptyDescription="Deliveries appear here once they have been graded."
      filterByGrade
    />
  )
}
