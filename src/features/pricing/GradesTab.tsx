import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { gradeApi } from '@/api/gradeApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { cn } from '@/lib/cn'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { GradeDef } from '@/lib/types'

export function GradesTab({ canManage }: { canManage: boolean }) {
  const [dialog, setDialog] = useState<GradeDef | 'new' | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.grades(false), queryFn: () => gradeApi.list(false) })

  const rows = useMemo(
    () =>
      (data ?? []).filter((g) => {
        const text = `${g.code} ${g.name} ${g.description ?? ''}`.toLowerCase()
        return (!q || text.includes(q.toLowerCase())) && (!status || String(g.active) === status)
      }),
    [data, q, status],
  )
  const activeFilters = [q, status].filter(Boolean).length

  const columns: Column<GradeDef>[] = [
    { key: 'order', header: 'Order', align: 'right', minWidth: 'min-w-[5rem]', cell: (g) => g.sortOrder },
    { key: 'code', header: 'Code', cell: (g) => <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm font-semibold">{g.code}</span> },
    { key: 'name', header: 'Name', minWidth: 'min-w-[9rem]', cell: (g) => <span className="font-medium">{g.name}</span> },
    { key: 'description', header: 'Description', minWidth: 'min-w-[16rem]', cell: (g) => g.description ?? <span className="text-stone-400">-</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (g) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', g.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {g.active ? 'Switched on' : 'Switched off'}
        </span>
      ),
    },
    ...(canManage
      ? [{ key: 'actions', header: 'Actions', cell: (g: GradeDef) => <Button size="sm" variant="secondary" onClick={() => setDialog(g)} aria-label={`Edit ${g.name}`}>Edit</Button> }]
      : []),
  ]

  return (
    <>
      <Card>
        <CardHeader
          title="Grades"
          description="The grades a delivery can be awarded. A grade can only be awarded once it has a price."
          actions={canManage ? <Button onClick={() => setDialog('new')}><Plus className="size-4" aria-hidden="true" /> Add grade</Button> : undefined}
        />
        <FilterPanel activeCount={activeFilters} onReset={() => { setQ(''); setStatus('') }}>
          <TextField label="Search" type="search" placeholder="Code, name or description" value={q} onChange={(e) => setQ(e.target.value)} />
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All grades</option>
            <option value="true">Switched on</option>
            <option value="false">Switched off</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Grades"
          columns={columns}
          rows={rows}
          rowKey={(g) => g.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeFilters > 0 ? 'No grades match these filters' : 'No grades yet'}
          emptyDescription={activeFilters > 0 ? undefined : 'Add the first grade so deliveries can be graded.'}
          mobileTitle={(g) => `${g.name} (${g.code})`}
        />
      </Card>
      {dialog && <GradeFormDialog grade={dialog === 'new' ? undefined : dialog} onClose={() => setDialog(null)} />}
    </>
  )
}

const schema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, 'Use 1-10 letters or digits, no spaces'),
  name: z.string().trim().min(2, 'Give the grade a name').max(60, 'Keep the name under 60 characters'),
  description: z.string().max(255, 'Keep it under 255 characters').optional(),
  sortOrder: z.number({ invalid_type_error: 'Enter a number' }).int('Use a whole number').min(0).max(9999),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function GradeFormDialog({ grade, onClose }: { grade?: GradeDef; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(grade)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: grade?.code ?? '', name: grade?.name ?? '', description: grade?.description ?? '', sortOrder: grade?.sortOrder ?? 0, active: grade?.active ?? true },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = { code: v.code.trim().toUpperCase(), name: v.name.trim(), description: v.description?.trim() || undefined, sortOrder: v.sortOrder, active: v.active }
      return grade ? gradeApi.update(grade.id, input) : gradeApi.create(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['grades'] })
      await queryClient.invalidateQueries({ queryKey: qk.prices })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `${saved.name} was updated.` : `${saved.name} (${saved.code}) added. Set its price before using it.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['code', 'name', 'description', 'sortOrder'])),
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
      title={editing ? `Edit ${grade!.name}` : 'Add a grade'}
      description={editing ? 'Switching a grade off stops it being awarded; past deliveries keep it.' : 'For example AA, Peaberry or Specialty.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Add grade'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Code" required disabled={editing} autoFocus={!editing} placeholder="e.g. AA" hint={editing ? 'The code cannot change once created.' : 'Stored in capitals.'} error={errors.code?.message} {...register('code')} />
          <TextField label="Display order" type="number" min={0} required hint="Lower numbers are shown first." error={errors.sortOrder?.message} {...register('sortOrder', { valueAsNumber: true })} />
        </div>
        <TextField label="Name" required autoFocus={editing} placeholder="e.g. Grade AA" error={errors.name?.message} {...register('name')} />
        <TextAreaField label="Description" placeholder="What qualifies for this grade?" error={errors.description?.message} {...register('description')} />
        {editing && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" {...register('active')} />
            <span>
              <span className="font-medium">Switched on</span>
              <span className="block text-stone-600">Off grades cannot be awarded to new deliveries.</span>
            </span>
          </label>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
