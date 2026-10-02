import { useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { directoryApi } from '@/api/directoryApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { SearchInput } from '@/components/SearchInput'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { applyServerError } from '@/lib/forms'
import { formatDate, stationToday } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useSearchState } from '@/lib/useSearchState'
import type { Employment, EmploymentType } from '@/lib/types'
import { useAllStations, useDepartments, useUserOptions } from './lookups'

const TYPE_LABELS: Record<EmploymentType, string> = { FULL_TIME: 'Full time', PART_TIME: 'Part time', SEASONAL: 'Seasonal', CONTRACT: 'Contract' }
const STATUS_STYLE: Record<Employment['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-900 ring-green-300',
  UPCOMING: 'bg-sky-100 text-sky-900 ring-sky-300',
  ENDED: 'bg-stone-100 text-stone-700 ring-stone-300',
}
const FILTERS = ['q', 'departmentId', 'stationId', 'type', 'status']

export function EmploymentsTab() {
  const s = useSearchState()
  const departments = useDepartments()
  const stations = useAllStations()
  const [dialog, setDialog] = useState<Employment | 'new' | null>(null)

  const filters = {
    q: s.get('q'),
    departmentId: s.get('departmentId') ? Number(s.get('departmentId')) : ('' as const),
    stationId: s.get('stationId') ? Number(s.get('stationId')) : ('' as const),
    type: s.get('type') as EmploymentType | '',
    status: s.get('status'),
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 20),
  }
  const activeCount = FILTERS.filter((k) => s.get(k) !== '').length
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.employments(filters),
    queryFn: () => directoryApi.employments(filters),
    placeholderData: keepPreviousData,
  })

  const columns: Column<Employment>[] = [
    {
      key: 'person',
      header: 'Person',
      minWidth: 'min-w-[12rem]',
      cell: (e) => (
        <div>
          <p className="font-semibold text-stone-900">{e.userName}</p>
          <p className="text-xs text-stone-600">@{e.username}</p>
        </div>
      ),
    },
    { key: 'title', header: 'Job title', minWidth: 'min-w-[10rem]', cell: (e) => e.jobTitle },
    { key: 'department', header: 'Department', minWidth: 'min-w-[9rem]', cell: (e) => e.departmentName ?? <span className="text-stone-400">None</span> },
    { key: 'station', header: 'Station', minWidth: 'min-w-[9rem]', cell: (e) => e.stationName ?? <span className="text-stone-400">None</span> },
    { key: 'type', header: 'Type', cell: (e) => TYPE_LABELS[e.employmentType] },
    { key: 'start', header: 'Start', cell: (e) => formatDate(e.startDate) },
    { key: 'end', header: 'End', cell: (e) => (e.endDate ? formatDate(e.endDate) : <span className="text-stone-400">Open</span>) },
    {
      key: 'status',
      header: 'Status',
      cell: (e) => <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLE[e.status])}>{e.status === 'ACTIVE' ? 'Active' : e.status === 'UPCOMING' ? 'Upcoming' : 'Ended'}</span>,
    },
    { key: 'actions', header: 'Actions', cell: (e) => <Button size="sm" variant="secondary" onClick={() => setDialog(e)} aria-label={`Edit employment of ${e.userName}`}>Edit</Button> },
  ]

  return (
    <>
      <Card>
        <CardHeader
          title="Employments"
          description="Where and in what capacity each person works, and for how long. End a record rather than deleting it."
          actions={<Button onClick={() => setDialog('new')}><Plus className="size-4" aria-hidden="true" /> New employment</Button>}
        />
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <SearchInput label="Search" value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Person or job title" />
          <SelectField label="Department" value={s.get('departmentId')} onChange={(e) => s.set({ departmentId: e.target.value })}>
            <option value="">All departments</option>
            {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </SelectField>
          <SelectField label="Station" value={s.get('stationId')} onChange={(e) => s.set({ stationId: e.target.value })}>
            <option value="">All stations</option>
            {stations.data?.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </SelectField>
          <SelectField label="Employment type" value={s.get('type')} onChange={(e) => s.set({ type: e.target.value })}>
            <option value="">Any type</option>
            {(Object.keys(TYPE_LABELS) as EmploymentType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </SelectField>
          <SelectField label="Status" value={s.get('status')} onChange={(e) => s.set({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ENDED">Ended</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Employments"
          columns={columns}
          rows={data?.content}
          rowKey={(e) => e.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No employment records match these filters' : 'No employment records yet'}
          emptyDescription={activeCount > 0 ? undefined : 'Record who works where, starting with your supervisors.'}
          pagination={data}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(e) => `${e.userName}: ${e.jobTitle}`}
        />
      </Card>
      {dialog && <EmploymentFormDialog employment={dialog === 'new' ? undefined : dialog} onClose={() => setDialog(null)} />}
    </>
  )
}

const schema = z
  .object({
    userId: z.string().min(1, 'Choose a person'),
    departmentId: z.string(),
    stationId: z.string(),
    jobTitle: z.string().trim().min(2, 'Enter the job title').max(100, 'Keep it under 100 characters'),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'SEASONAL', 'CONTRACT']),
    startDate: z.string().min(1, 'Enter the start date'),
    endDate: z.string(),
    notes: z.string().max(500, 'Keep the notes under 500 characters'),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'The end date cannot be before the start date' })
type FormValues = z.infer<typeof schema>

function EmploymentFormDialog({ employment, onClose }: { employment?: Employment; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(employment)
  const users = useUserOptions()
  const departments = useDepartments()
  const stations = useAllStations()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: employment ? String(employment.userId) : '',
      departmentId: employment?.departmentId ? String(employment.departmentId) : '',
      stationId: employment?.stationId ? String(employment.stationId) : '',
      jobTitle: employment?.jobTitle ?? '',
      employmentType: employment?.employmentType ?? 'FULL_TIME',
      startDate: employment?.startDate ?? stationToday(),
      endDate: employment?.endDate ?? '',
      notes: employment?.notes ?? '',
    },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = {
        userId: Number(v.userId),
        departmentId: v.departmentId ? Number(v.departmentId) : null,
        stationId: v.stationId ? Number(v.stationId) : null,
        jobTitle: v.jobTitle.trim(),
        employmentType: v.employmentType,
        startDate: v.startDate,
        endDate: v.endDate || null,
        notes: v.notes.trim() || undefined,
      }
      return employment ? directoryApi.updateEmployment(employment.id, input) : directoryApi.createEmployment(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `Employment of ${saved.userName} updated.` : `Employment recorded for ${saved.userName}.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['userId', 'jobTitle', 'startDate', 'endDate', 'notes'])),
  })
  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    mutation.mutate(v)
  })

  return (
    <Modal
      open
      onClose={onClose}
      busy={mutation.isPending}
      size="lg"
      title={editing ? `Employment of ${employment!.userName}` : 'New employment record'}
      description={editing ? 'To end it, set an end date.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Record employment'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <SelectField label="Person" required disabled={editing} error={errors.userId?.message} {...register('userId')}>
          <option value="">Choose a person...</option>
          {users.data?.content.map((u) => <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>)}
          {editing && !users.data?.content.some((u) => u.id === employment!.userId) && <option value={employment!.userId}>{employment!.userName}</option>}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Job title" required placeholder="e.g. Weighing Clerk" error={errors.jobTitle?.message} {...register('jobTitle')} />
          <SelectField label="Employment type" required {...register('employmentType')}>
            {(Object.keys(TYPE_LABELS) as EmploymentType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Department" {...register('departmentId')}>
            <option value="">No department</option>
            {departments.data?.filter((d) => d.active || d.id === employment?.departmentId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </SelectField>
          <SelectField label="Station" {...register('stationId')}>
            <option value="">No station</option>
            {stations.data?.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start date" type="date" required error={errors.startDate?.message} {...register('startDate')} />
          <TextField label="End date" type="date" hint="Leave empty while the job continues." error={errors.endDate?.message} {...register('endDate')} />
        </div>
        <TextAreaField label="Notes" error={errors.notes?.message} {...register('notes')} />
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
