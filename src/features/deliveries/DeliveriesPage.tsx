import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { deliveryApi } from '@/api/deliveryApi'
import { gradeApi } from '@/api/gradeApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { DataTable, type SortState } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { FilterPanel } from '@/components/FilterPanel'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { useSearchState } from '@/lib/useSearchState'
import type { DeliveryFilters, DeliveryStatus, Grade } from '@/lib/types'
import { useFarmerOptions } from '../farmers/useFarmerOptions'
import { fullColumns } from './deliveryColumns'
import { DeliveryCard } from './DeliveryCard'

const DEFAULTS = { sortBy: 'createdAt', dir: 'desc' }
const FILTER_KEYS = ['q', 'from', 'to', 'status', 'grade', 'farmerId', 'minWeight', 'maxWeight']

export function DeliveriesPage() {
  const { user } = useAuth()
  const s = useSearchState(DEFAULTS)
  const farmers = useFarmerOptions()
  const grades = useQuery({ queryKey: qk.grades(false), queryFn: () => gradeApi.list(false), staleTime: 60_000 })

  const filters: DeliveryFilters = {
    q: s.get('q'),
    from: s.get('from'),
    to: s.get('to'),
    status: s.get('status') as DeliveryStatus | '',
    grade: s.get('grade') as Grade | '',
    farmerId: s.get('farmerId') ? Number(s.get('farmerId')) : '',
    minWeight: s.get('minWeight') ? Number(s.get('minWeight')) : '',
    maxWeight: s.get('maxWeight') ? Number(s.get('maxWeight')) : '',
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 20),
    sortBy: s.get('sortBy'),
    dir: s.get('dir') as 'asc' | 'desc',
  }
  const activeCount = FILTER_KEYS.filter((k) => s.get(k) !== '').length

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.deliveries(filters),
    queryFn: () => deliveryApi.list(filters),
    placeholderData: keepPreviousData,
  })

  const sort: SortState = { by: filters.sortBy!, dir: filters.dir! }
  const invalidRange = filters.from && filters.to && filters.from > filters.to

  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Every cherry delivery received at the station, with its grade, price and payment status."
        actions={
          can(user, 'createDeliveries') ? (
            <Link to="/deliveries/new" className="hidden h-9 items-center gap-2 rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700 lg:inline-flex">
              <Plus className="size-4" aria-hidden="true" /> New delivery
            </Link>
          ) : undefined
        }
      />
      <Card>
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <SearchInput label="Search" value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Reference, farmer, phone, cooperative no." />
          <DatePicker label="From date" value={s.get('from')} max={s.get('to') || undefined} onChange={(v) => s.set({ from: v })} />
          <DatePicker label="To date" value={s.get('to')} min={s.get('from') || undefined} onChange={(v) => s.set({ to: v })} error={invalidRange ? 'End date is before start date' : undefined} />
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
            {farmers.data?.content.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fullName} ({f.cooperativeNumber})
              </option>
            ))}
          </SelectField>
          <TextField label="Min weight (kg)" type="number" min={0} step="0.01" inputMode="decimal" value={s.get('minWeight')} onChange={(e) => s.set({ minWeight: e.target.value })} />
          <TextField label="Max weight (kg)" type="number" min={0} step="0.01" inputMode="decimal" value={s.get('maxWeight')} onChange={(e) => s.set({ maxWeight: e.target.value })} />
        </FilterPanel>

        <DataTable
          caption="Deliveries"
          columns={fullColumns()}
          mobileCard={(d) => <DeliveryCard delivery={d} />}
          rows={invalidRange ? [] : data?.content}
          rowKey={(d) => d.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No deliveries match these filters' : 'No deliveries yet'}
          emptyDescription={activeCount > 0 ? 'Try widening or resetting the filters.' : 'Record the first delivery to get started.'}
          sort={sort}
          onSortChange={(next) => s.set({ sortBy: next.by, dir: next.dir })}
          pagination={data && !invalidRange ? data : undefined}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(d) => d.reference}
        />
      </Card>
    </>
  )
}
