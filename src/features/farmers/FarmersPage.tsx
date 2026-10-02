import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { farmerApi } from '@/api/farmerApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { DataTable, type Column, type SortState } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { formatKg, formatNumber, formatRwf } from '@/lib/format'
import { useSearchState } from '@/lib/useSearchState'
import type { Farmer } from '@/lib/types'
import { FarmerFormDialog } from './FarmerFormDialog'

const DEFAULTS = { sortBy: 'fullName', dir: 'asc' }

export function FarmersPage() {
  const { user } = useAuth()
  const canManage = can(user, 'manageFarmers')
  const s = useSearchState(DEFAULTS)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Farmer | null>(null)

  const filters = {
    q: s.get('q'),
    active: s.get('active') === '' ? ('' as const) : s.get('active') === 'true',
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 20),
    sortBy: s.get('sortBy'),
    dir: s.get('dir') as 'asc' | 'desc',
  }
  const activeCount = ['q', 'active'].filter((k) => s.get(k) !== '').length

  const summary = useQuery({ queryKey: qk.farmerSummary, queryFn: farmerApi.summary })
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.farmers(filters),
    queryFn: () => farmerApi.list(filters),
    placeholderData: keepPreviousData,
  })
  const sort: SortState = { by: filters.sortBy, dir: filters.dir }

  const columns: Column<Farmer>[] = [
    { key: 'code', header: 'Cooperative no.', sortKey: 'cooperativeNumber', cell: (f) => <span className="font-medium">{f.cooperativeNumber}</span> },
    { key: 'name', header: 'Name', sortKey: 'fullName', cell: (f) => <Link to={`/farmers/${f.id}`} className="font-medium text-brand-700 hover:underline">{f.fullName}</Link> },
    { key: 'phone', header: 'Phone', sortKey: 'phone', cell: (f) => f.phone },
    { key: 'deliveries', header: 'Deliveries', align: 'right', cell: (f) => formatNumber(f.totalDeliveries) },
    { key: 'weight', header: 'Total weight', align: 'right', cell: (f) => formatKg(f.totalWeightKg) },
    { key: 'amount', header: 'Total paid', align: 'right', cell: (f) => formatRwf(f.totalAmountPaid) },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'active',
      cell: (f) => (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', f.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {f.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (f) => (
        <div className="flex gap-1.5">
          <Link to={`/farmers/${f.id}`} className="inline-flex h-8 items-center rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium hover:bg-stone-50" aria-label={`View ${f.fullName}`}>
            View
          </Link>
          {canManage && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(f)} aria-label={`Edit ${f.fullName}`}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Farmers"
        description="Registered farmers and their delivery totals."
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" /> Register farmer
            </Button>
          ) : undefined
        }
      />

      <section aria-label="Farmer summary" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total farmers" value={summary.data ? formatNumber(summary.data.total) : '-'} />
        <MetricCard label="Active farmers" value={summary.data ? formatNumber(summary.data.active) : '-'} />
        <MetricCard label="Inactive farmers" value={summary.data ? formatNumber(summary.data.inactive) : '-'} />
        <MetricCard label="Deliveries today" value={summary.data ? formatNumber(summary.data.deliveriesToday) : '-'} />
      </section>

      <Card>
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <SearchInput value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Name, phone or cooperative no." />
          <SelectField label="Status" value={s.get('active')} onChange={(e) => s.set({ active: e.target.value })}>
            <option value="">All farmers</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Farmers"
          columns={columns}
          rows={data?.content}
          rowKey={(f) => f.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No farmers match these filters' : 'No farmers registered yet'}
          emptyDescription={activeCount > 0 ? 'Try a different search or reset the filters.' : 'Register a farmer to start recording deliveries.'}
          emptyAction={activeCount === 0 && canManage ? <Button onClick={() => setCreating(true)}>Register farmer</Button> : undefined}
          sort={sort}
          onSortChange={(next) => s.set({ sortBy: next.by, dir: next.dir })}
          pagination={data}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(f) => f.fullName}
        />
      </Card>

      {creating && <FarmerFormDialog open onClose={() => setCreating(false)} />}
      {editing && <FarmerFormDialog farmer={editing} open onClose={() => setEditing(null)} />}
    </>
  )
}
