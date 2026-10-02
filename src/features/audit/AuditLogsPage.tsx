import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/auditApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { stationApi } from '@/api/stationApi'
import { useAuth } from '@/auth/AuthContext'
import { FilterPanel } from '@/components/FilterPanel'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { formatDateTime } from '@/lib/format'
import { useSearchState } from '@/lib/useSearchState'
import type { AuditLog } from '@/lib/types'

const ACTIONS = [
  'FARMER_CREATED', 'FARMER_UPDATED', 'DELIVERY_CREATED', 'WEIGHT_CORRECTED', 'DELIVERY_GRADED', 'DELIVERY_REJECTED',
  'DELIVERY_PAID', 'PRICE_CHANGED', 'CAPACITY_ADJUSTED', 'GRADE_CREATED', 'GRADE_UPDATED', 'STATION_CREATED', 'STATION_UPDATED',
  'STATION_USERS_CHANGED', 'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATION_CHANGED', 'USER_PASSWORD_RESET', 'PROFILE_UPDATED',
  'PASSWORD_CHANGED', 'ROLE_CREATED', 'ROLE_UPDATED', 'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'EMPLOYMENT_CREATED', 'EMPLOYMENT_UPDATED',
]
const ENTITIES = ['DELIVERY', 'FARMER', 'PRICE', 'GRADE', 'STATION', 'USER', 'ROLE', 'DEPARTMENT', 'EMPLOYMENT']
const FILTER_KEYS = ['from', 'to', 'username', 'action', 'entityType', 'stationId']

function EntityLink({ log }: { log: AuditLog }) {
  const to = log.entityType === 'DELIVERY' ? `/deliveries/${log.entityId}` : log.entityType === 'FARMER' ? `/farmers/${log.entityId}` : null
  return to ? (
    <Link to={to} className="text-brand-700 hover:underline">
      {log.entityId}
    </Link>
  ) : (
    <>{log.entityId}</>
  )
}

export function AuditLogsPage() {
  const s = useSearchState()
  const { user } = useAuth()
  const stations = useQuery({ queryKey: ['stations', 'audit-filter'], queryFn: () => stationApi.list(true), staleTime: 60_000 })
  const filters = {
    from: s.get('from'),
    to: s.get('to'),
    username: s.get('username'),
    action: s.get('action'),
    entityType: s.get('entityType'),
    stationId: s.get('stationId') ? Number(s.get('stationId')) : ('' as const),
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 25),
  }
  const activeCount = FILTER_KEYS.filter((k) => s.get(k) !== '').length
  const invalidRange = filters.from && filters.to && filters.from > filters.to

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.audit(filters),
    queryFn: () => auditApi.list(filters),
    placeholderData: keepPreviousData,
    enabled: !invalidRange,
  })

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Timestamp', cell: (l) => <time dateTime={l.occurredAt}>{formatDateTime(l.occurredAt)}</time> },
    { key: 'user', header: 'User', cell: (l) => l.username },
    { key: 'action', header: 'Action', cell: (l) => <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{l.action}</code> },
    { key: 'entity', header: 'Entity', cell: (l) => l.entityType },
    { key: 'entityId', header: 'Entity ID', cell: (l) => <EntityLink log={l} /> },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-md',
      cell: (l) => (
        <div>
          <p>{l.description}</p>
          {l.details && (
            <details className="mt-1">
              <summary className="text-xs text-stone-600 underline-offset-2 hover:underline">Details</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-stone-100 p-2 text-xs whitespace-pre-wrap">{JSON.stringify(l.details, null, 2)}</pre>
            </details>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Audit logs" description="A read-only record of important actions. Entries can't be edited or deleted." />
      <Card>
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <DatePicker label="From date" value={s.get('from')} max={s.get('to') || undefined} onChange={(v) => s.set({ from: v })} />
          <DatePicker label="To date" value={s.get('to')} min={s.get('from') || undefined} onChange={(v) => s.set({ to: v })} error={invalidRange ? 'End date is before start date' : undefined} />
          <TextField label="User" placeholder="Exact username" value={s.get('username')} onChange={(e) => s.set({ username: e.target.value })} />
          <SelectField label="Action" value={s.get('action')} onChange={(e) => s.set({ action: e.target.value })}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </SelectField>
          {(stations.data?.length ?? 0) > 1 && (
            <SelectField label="Station" value={s.get('stationId')} onChange={(e) => s.set({ stationId: e.target.value })} hint={user?.role === 'ADMIN' ? undefined : 'Stations you manage'}>
              <option value="">All stations</option>
              {stations.data?.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </SelectField>
          )}
          <SelectField label="Entity" value={s.get('entityType')} onChange={(e) => s.set({ entityType: e.target.value })}>
            <option value="">All entities</option>
            {ENTITIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Audit log"
          columns={columns}
          rows={invalidRange ? [] : data?.content}
          rowKey={(l) => l.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No entries match these filters' : 'No audit entries yet'}
          pagination={data && !invalidRange ? data : undefined}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(l) => l.description}
        />
      </Card>
    </>
  )
}
