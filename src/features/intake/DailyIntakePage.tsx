import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { dashboardApi } from '@/api/dashboardApi'
import { deliveryApi } from '@/api/deliveryApi'
import { gradeApi } from '@/api/gradeApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { CapacityProgress } from '@/components/CapacityProgress'
import { DataTable, type SortState } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { ErrorState, LoadingState } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { addDays, formatDate, formatKg, formatNumber, stationToday } from '@/lib/format'
import { useSearchState } from '@/lib/useSearchState'
import type { DeliveryFilters, DeliveryStatus } from '@/lib/types'
import { compactColumns } from '../deliveries/deliveryColumns'
import { DeliveryCard } from '../deliveries/DeliveryCard'
import { AdjustCapacityDialog } from './AdjustCapacityDialog'
import { useFarmerOptions } from '../farmers/useFarmerOptions'

const DEFAULTS = { sortBy: 'createdAt', dir: 'desc' }

export function DailyIntakePage() {
  const today = stationToday()
  const s = useSearchState(DEFAULTS)
  const date = s.get('date') || today
  const farmers = useFarmerOptions()
  const { user } = useAuth()
  const grades = useQuery({ queryKey: qk.grades(false), queryFn: () => gradeApi.list(false), staleTime: 60_000 })
  const [adjusting, setAdjusting] = useState(false)

  const capacity = useQuery({ queryKey: qk.capacity(date), queryFn: () => dashboardApi.capacity(date), placeholderData: keepPreviousData })

  const filters: DeliveryFilters = {
    date,
    q: s.get('q'),
    status: s.get('status') as DeliveryStatus | '',
    grade: s.get('grade'),
    farmerId: s.get('farmerId') ? Number(s.get('farmerId')) : '',
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 15),
    sortBy: s.get('sortBy'),
    dir: s.get('dir') as 'asc' | 'desc',
  }
  const activeCount = ['q', 'status', 'grade', 'farmerId'].filter((k) => s.get(k) !== '').length

  const list = useQuery({ queryKey: qk.deliveries(filters), queryFn: () => deliveryApi.list(filters), placeholderData: keepPreviousData })
  const sort: SortState = { by: filters.sortBy!, dir: filters.dir! }

  // Moving to another day clears the day-specific filters but keeps the sort.
  const goTo = (next: string) => s.set({ date: next === today ? '' : next, q: '', status: '', grade: '', farmerId: '' })
  const isToday = date === today
  const c = capacity.data

  return (
    <>
      <PageHeader title="Daily intake" description="Accepted weight against the daily station capacity, and every delivery for the selected day." />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => goTo(addDays(date, -1))} aria-label="Previous day">
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </Button>
            <TextField label="Date" type="date" max={today} value={date} onChange={(e) => e.target.value && goTo(e.target.value)} fieldClassName="w-44" />
            <Button variant="secondary" onClick={() => goTo(addDays(date, 1))} disabled={isToday} aria-label="Next day">
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-stone-700" aria-live="polite">{formatDate(date)}</p>
            {!isToday && <Button variant="ghost" onClick={() => goTo(today)}>Jump to today</Button>}
          </div>
        </CardBody>
      </Card>

      {capacity.isLoading && <LoadingState label="Loading capacity..." />}
      {capacity.error && <Card className="mb-5"><ErrorState error={capacity.error} onRetry={() => void capacity.refetch()} /></Card>}

      {c && (
        <>
          {c.alert === 'FULL' && <Alert tone="danger" className="mb-4" title="Daily intake capacity reached." />}
          {c.alert === 'LOW' && <Alert tone="warning" className="mb-4" title="Daily intake capacity is nearly reached.">{formatKg(c.remainingKg)} left for this day.</Alert>}

          <section aria-label="Capacity" className="mb-5 grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Capacity"
                description={`${formatKg(c.dailyLimitKg)} limit for this day`}
                actions={can(user, 'adjustCapacity') ? <Button variant="secondary" onClick={() => setAdjusting(true)}><SlidersHorizontal className="size-4" aria-hidden="true" /> Adjust capacity</Button> : undefined}
              />
              <CardBody>
                <CapacityProgress acceptedKg={c.acceptedKg} limitKg={c.dailyLimitKg} remainingKg={c.remainingKg} utilizationPercent={c.utilizationPercent} alert={c.alert} size="lg" />
              </CardBody>
            </Card>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <MetricCard label="Daily capacity" value={formatKg(c.dailyLimitKg)} />
              <MetricCard label="Remaining capacity" value={formatKg(c.remainingKg)} />
            </div>
          </section>

          <section aria-label="Day totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total deliveries" value={formatNumber(c.totalDeliveries)} />
            <MetricCard label="Total accepted weight" value={formatKg(c.acceptedKg)} />
            <MetricCard label="Rejected weight" value={formatKg(c.rejectedKg)} hint="Not counted toward capacity" />
            <MetricCard label="Average delivery weight" value={formatKg(c.averageAcceptedWeightKg)} hint="Accepted deliveries" />
          </section>
        </>
      )}

      <Card>
        <CardHeader title={`Deliveries on ${formatDate(date)}`} />
        <FilterPanel onReset={() => s.set({ q: '', status: '', grade: '', farmerId: '' })} activeCount={activeCount}>
          <SearchInput value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Reference, farmer, phone..." />
          <SelectField label="Status" value={s.get('status')} onChange={(e) => s.set({ status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="GRADED">Graded</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </SelectField>
          <SelectField label="Grade" value={s.get('grade')} onChange={(e) => s.set({ grade: e.target.value })}>
            <option value="">Any grade</option>
            {grades.data?.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </SelectField>
          <SelectField label="Farmer" value={s.get('farmerId')} onChange={(e) => s.set({ farmerId: e.target.value })}>
            <option value="">All farmers</option>
            {farmers.data?.content.map((f) => <option key={f.id} value={f.id}>{f.fullName}</option>)}
          </SelectField>
        </FilterPanel>
        <DataTable
          caption={`Deliveries on ${date}`}
          columns={compactColumns()}
          mobileCard={(d) => <DeliveryCard delivery={d} />}
          rows={list.data?.content}
          rowKey={(d) => d.id}
          loading={list.isLoading || list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
          emptyTitle={activeCount > 0 ? 'No deliveries match these filters' : 'No deliveries on this day'}
          emptyDescription={activeCount > 0 ? 'Reset the filters to see every delivery for the day.' : undefined}
          sort={sort}
          onSortChange={(next) => s.set({ sortBy: next.by, dir: next.dir })}
          pagination={list.data}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(d) => d.reference}
        />
      </Card>
      {adjusting && c && <AdjustCapacityDialog capacity={c} onClose={() => setAdjusting(false)} />}
    </>
  )
}
