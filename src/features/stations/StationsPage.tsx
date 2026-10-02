import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { stationApi } from '@/api/stationApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { formatKg, formatNumber } from '@/lib/format'
import type { Station } from '@/lib/types'
import { AssignUsersDialog } from './AssignUsersDialog'
import { StationFormDialog } from './StationFormDialog'

export function StationsPage() {
  const [dialog, setDialog] = useState<{ kind: 'form'; station?: Station } | { kind: 'users'; station: Station } | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.stations(true), queryFn: () => stationApi.list(true) })

  const rows = useMemo(
    () =>
      (data ?? []).filter((s) => {
        const text = `${s.code} ${s.name} ${s.location ?? ''}`.toLowerCase()
        return (!q || text.includes(q.toLowerCase())) && (!status || String(s.active) === status)
      }),
    [data, q, status],
  )
  const activeFilters = [q, status].filter(Boolean).length
  const totalCapacity = (data ?? []).filter((s) => s.active).reduce((sum, s) => sum + s.dailyCapacityKg, 0)

  const columns: Column<Station>[] = [
    { key: 'code', header: 'Code', cell: (s) => <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm font-semibold">{s.code}</span> },
    {
      key: 'name',
      header: 'Station',
      minWidth: 'min-w-[14rem]',
      cell: (s) => (
        <div>
          <p className="font-semibold text-stone-900">{s.name}</p>
          <p className="text-xs text-stone-600">{s.location ?? 'No location'} · {s.timezone}</p>
        </div>
      ),
    },
    { key: 'capacity', header: 'Daily capacity', align: 'right', cell: (s) => formatKg(s.dailyCapacityKg) },
    { key: 'max', header: 'Largest delivery', align: 'right', cell: (s) => formatKg(s.maxDeliveryKg) },
    { key: 'low', header: 'Low-capacity warning', align: 'right', cell: (s) => formatKg(s.lowThresholdKg) },
    { key: 'staff', header: 'Assigned staff', align: 'right', cell: (s) => formatNumber(s.assignedUsers) },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', s.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {s.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (s) => (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'form', station: s })} aria-label={`Edit ${s.name}`}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'users', station: s })} aria-label={`Manage staff of ${s.name}`}>
            <Users className="size-3.5" aria-hidden="true" /> Staff
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Stations"
        description="Register the washing stations you operate. People assigned to a station manage it, and only see its deliveries."
        actions={<Button onClick={() => setDialog({ kind: 'form' })}><Plus className="size-4" aria-hidden="true" /> Register station</Button>}
      />

      <section aria-label="Station summary" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Stations" value={formatNumber((data ?? []).length)} />
        <MetricCard label="Active" value={formatNumber((data ?? []).filter((s) => s.active).length)} accent="#4b7a2a" />
        <MetricCard label="Combined daily capacity" value={formatKg(totalCapacity)} hint="Active stations" />
        <MetricCard label="Staff assignments" value={formatNumber((data ?? []).reduce((sum, s) => sum + s.assignedUsers, 0))} />
      </section>

      <Card>
        <FilterPanel activeCount={activeFilters} onReset={() => { setQ(''); setStatus('') }}>
          <TextField label="Search" type="search" placeholder="Code, name or location" value={q} onChange={(e) => setQ(e.target.value)} />
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All stations</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Stations"
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeFilters > 0 ? 'No stations match these filters' : 'No stations registered yet'}
          emptyDescription={activeFilters > 0 ? undefined : 'Register your first station to start recording deliveries.'}
          emptyAction={activeFilters === 0 ? <Button onClick={() => setDialog({ kind: 'form' })}>Register station</Button> : undefined}
          mobileTitle={(s) => `${s.name} (${s.code})`}
        />
      </Card>

      {dialog?.kind === 'form' && <StationFormDialog station={dialog.station} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'users' && <AssignUsersDialog station={dialog.station} onClose={() => setDialog(null)} />}
    </>
  )
}
