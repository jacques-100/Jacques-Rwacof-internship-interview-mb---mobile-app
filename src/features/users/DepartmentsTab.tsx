import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { directoryApi } from '@/api/directoryApi'
import { DataTable, type Column } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { applyServerError } from '@/lib/forms'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Department } from '@/lib/types'
import { useDepartments, useUserOptions } from './lookups'

export function DepartmentsTab() {
  const { data, isLoading, error, refetch } = useDepartments()
  const [dialog, setDialog] = useState<Department | 'new' | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () =>
      (data ?? []).filter((d) => {
        const text = `${d.code} ${d.name} ${d.description ?? ''} ${d.headName ?? ''}`.toLowerCase()
        return (!q || text.includes(q.toLowerCase())) && (!status || String(d.active) === status)
      }),
    [data, q, status],
  )
  const activeFilters = [q, status].filter(Boolean).length

  const columns: Column<Department>[] = [
    { key: 'code', header: 'Code', cell: (d) => <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-sm font-semibold">{d.code}</span> },
    { key: 'name', header: 'Department', minWidth: 'min-w-[12rem]', cell: (d) => <span className="font-semibold text-stone-900">{d.name}</span> },
    { key: 'description', header: 'Description', minWidth: 'min-w-[14rem]', cell: (d) => d.description ?? <span className="text-stone-400">-</span> },
    { key: 'head', header: 'Head', minWidth: 'min-w-[10rem]', cell: (d) => d.headName ?? <span className="text-stone-400">Not set</span> },
    { key: 'staff', header: 'Current staff', align: 'right', cell: (d) => d.currentStaff },
    {
      key: 'status',
      header: 'Status',
      cell: (d) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', d.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {d.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'actions', header: 'Actions', cell: (d) => <Button size="sm" variant="secondary" onClick={() => setDialog(d)} aria-label={`Edit ${d.name}`}>Edit</Button> },
  ]

  return (
    <>
      <Card>
        <CardHeader
          title="Departments"
          description="The teams at your stations. People are placed in a department through their employment record."
          actions={<Button onClick={() => setDialog('new')}><Plus className="size-4" aria-hidden="true" /> New department</Button>}
        />
        <FilterPanel activeCount={activeFilters} onReset={() => { setQ(''); setStatus('') }}>
          <TextField label="Search" type="search" placeholder="Code, name or head" value={q} onChange={(e) => setQ(e.target.value)} />
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All departments</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Departments"
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeFilters > 0 ? 'No departments match these filters' : 'No departments yet'}
          emptyDescription={activeFilters > 0 ? undefined : 'Create departments such as Intake, Quality Control or Finance.'}
          mobileTitle={(d) => d.name}
        />
      </Card>
      {dialog && <DepartmentFormDialog department={dialog === 'new' ? undefined : dialog} onClose={() => setDialog(null)} />}
    </>
  )
}

const schema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9-]{2,20}$/, 'Use 2-20 letters, digits or dashes'),
  name: z.string().trim().min(2, 'Give the department a name').max(100, 'Keep the name under 100 characters'),
  description: z.string().max(255, 'Keep it under 255 characters'),
  headUserId: z.string(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function DepartmentFormDialog({ department, onClose }: { department?: Department; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(department)
  const users = useUserOptions()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: department?.code ?? '', name: department?.name ?? '', description: department?.description ?? '', headUserId: department?.headUserId ? String(department.headUserId) : '', active: department?.active ?? true },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = { code: v.code.trim().toUpperCase(), name: v.name.trim(), description: v.description.trim() || undefined, headUserId: v.headUserId ? Number(v.headUserId) : null, active: v.active }
      return department ? directoryApi.updateDepartment(department.id, input) : directoryApi.createDepartment(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `${saved.name} was updated.` : `Department ${saved.name} created.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['code', 'name', 'description'])),
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
      title={editing ? `Edit ${department!.name}` : 'New department'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Create department'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Code" required autoFocus placeholder="e.g. QLT" error={errors.code?.message} fieldClassName="sm:col-span-1" {...register('code')} />
          <TextField label="Name" required placeholder="e.g. Quality Control" error={errors.name?.message} fieldClassName="sm:col-span-2" {...register('name')} />
        </div>
        <TextAreaField label="Description" error={errors.description?.message} {...register('description')} />
        <SelectField label="Department head" hint="Optional. Only active people can be chosen." {...register('headUserId')}>
          <option value="">No head</option>
          {users.data?.content.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.jobRole.name})</option>)}
        </SelectField>
        {editing && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" {...register('active')} />
            <span>
              <span className="font-medium">Active</span>
              <span className="block text-stone-600">Inactive departments cannot be used in new employment records.</span>
            </span>
          </label>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
