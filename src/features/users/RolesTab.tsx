import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { directoryApi } from '@/api/directoryApi'
import { ROLE_LABELS } from '@/auth/permissions'
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
import type { JobRole } from '@/lib/types'
import { useRoles } from './lookups'

const LEVEL_HELP: Record<string, string> = {
  CLERK: 'Daily operations: receive, grade and reject deliveries.',
  SUPERVISOR: 'Everything a clerk can do, plus payments, prices, reports, audit and capacity adjustments.',
  ADMIN: 'Everything, including stations, users and the staff directory.',
}

export function RolesTab() {
  const { data, isLoading, error, refetch } = useRoles()
  const [dialog, setDialog] = useState<JobRole | 'new' | null>(null)
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () =>
      (data ?? []).filter((r) => {
        const text = `${r.name} ${r.description ?? ''}`.toLowerCase()
        return (!q || text.includes(q.toLowerCase())) && (!level || r.accessLevel === level) && (!status || String(r.active) === status)
      }),
    [data, q, level, status],
  )
  const activeFilters = [q, level, status].filter(Boolean).length

  const columns: Column<JobRole>[] = [
    {
      key: 'name',
      header: 'Role',
      minWidth: 'min-w-[12rem]',
      cell: (r) => (
        <div>
          <p className="font-semibold text-stone-900">{r.name}</p>
          {r.systemRole && <p className="text-xs text-stone-600">Built-in</p>}
        </div>
      ),
    },
    { key: 'description', header: 'Description', minWidth: 'min-w-[16rem]', cell: (r) => r.description ?? <span className="text-stone-400">-</span> },
    { key: 'level', header: 'Access level', cell: (r) => ROLE_LABELS[r.accessLevel] },
    { key: 'permissions', header: 'Permissions', align: 'right', cell: (r) => `${r.permissions.length} granted` },
    { key: 'users', header: 'People', align: 'right', cell: (r) => r.users },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', r.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {r.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'actions', header: 'Actions', cell: (r) => <Button size="sm" variant="secondary" onClick={() => setDialog(r)} aria-label={`Edit ${r.name}`}>Edit</Button> },
  ]

  return (
    <>
      <Card>
        <CardHeader
          title="Roles"
          description="Name the positions people hold. Each role carries one of three access levels, which is what the system actually enforces."
          actions={<Button onClick={() => setDialog('new')}><Plus className="size-4" aria-hidden="true" /> New role</Button>}
        />
        <FilterPanel activeCount={activeFilters} onReset={() => { setQ(''); setLevel(''); setStatus('') }}>
          <TextField label="Search" type="search" placeholder="Name or description" value={q} onChange={(e) => setQ(e.target.value)} />
          <SelectField label="Access level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Any level</option>
            <option value="ADMIN">Administrator</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="CLERK">Clerk</option>
          </SelectField>
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All roles</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Roles"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeFilters > 0 ? 'No roles match these filters' : 'No roles'}
          mobileTitle={(r) => r.name}
        />
      </Card>
      {dialog && <RoleFormDialog role={dialog === 'new' ? undefined : dialog} onClose={() => setDialog(null)} />}
    </>
  )
}

const schema = z.object({
  name: z.string().trim().min(2, 'Give the role a name').max(80, 'Keep the name under 80 characters'),
  description: z.string().max(255, 'Keep it under 255 characters'),
  accessLevel: z.enum(['ADMIN', 'SUPERVISOR', 'CLERK']),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function RoleFormDialog({ role, onClose }: { role?: JobRole; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(role)
  const locked = role?.systemRole ?? false
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '', accessLevel: role?.accessLevel ?? 'CLERK', active: role?.active ?? true },
  })
  const level = watch('accessLevel')

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = { name: v.name.trim(), description: v.description.trim() || undefined, accessLevel: v.accessLevel, active: v.active }
      return role ? directoryApi.updateRole(role.id, input) : directoryApi.createRole(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `${saved.name} was updated.` : `Role ${saved.name} created.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['name', 'description', 'accessLevel'])),
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
      title={editing ? `Edit ${role!.name}` : 'New role'}
      description={locked ? 'Built-in roles keep their name and access level; only the description can change.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Create role'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <TextField label="Role name" required disabled={locked} autoFocus placeholder="e.g. Quality Inspector" error={errors.name?.message} {...register('name')} />
        <TextAreaField label="Description" placeholder="What does this role do?" error={errors.description?.message} {...register('description')} />
        <SelectField label="Access level" required disabled={locked} hint={`${LEVEL_HELP[level]} ${editing ? '' : 'The role starts with the permissions of that level; fine-tune them on the Permissions tab.'}`} error={errors.accessLevel?.message} {...register('accessLevel')}>
          <option value="CLERK">Clerk</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Administrator</option>
        </SelectField>
        {editing && !locked && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" {...register('active')} />
            <span>
              <span className="font-medium">Active</span>
              <span className="block text-stone-600">Inactive roles cannot be given to anyone new.</span>
            </span>
          </label>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
