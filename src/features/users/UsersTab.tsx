import { useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { qk } from '@/api/queryKeys'
import { userApi } from '@/api/userApi'
import { ROLE_LABELS } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { DataTable, type Column, type SortState } from '@/components/DataTable'
import { FilterPanel } from '@/components/FilterPanel'
import { SearchInput } from '@/components/SearchInput'
import { errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { applyServerError } from '@/lib/forms'
import { formatDate } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useSearchState } from '@/lib/useSearchState'
import type { Role, User } from '@/lib/types'
import { useAllStations, useRoles } from './lookups'

const DEFAULTS = { sortBy: 'fullName', dir: 'asc' }
const FILTERS = ['q', 'role', 'jobRoleId', 'stationId', 'active']

export function UsersTab() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const s = useSearchState(DEFAULTS)
  const roles = useRoles()
  const stations = useAllStations()
  const [dialog, setDialog] = useState<{ kind: 'create' } | { kind: 'edit' | 'reset' | 'toggle'; user: User } | null>(null)

  const filters = {
    q: s.get('q'),
    role: s.get('role') as Role | '',
    jobRoleId: s.get('jobRoleId') ? Number(s.get('jobRoleId')) : ('' as const),
    stationId: s.get('stationId') ? Number(s.get('stationId')) : ('' as const),
    active: s.get('active') === '' ? ('' as const) : s.get('active') === 'true',
    page: s.getNumber('page', 0),
    size: s.getNumber('size', 20),
    sortBy: s.get('sortBy'),
    dir: s.get('dir') as 'asc' | 'desc',
  }
  const activeCount = FILTERS.filter((k) => s.get(k) !== '').length
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.users(filters),
    queryFn: () => userApi.list(filters),
    placeholderData: keepPreviousData,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    await queryClient.invalidateQueries({ queryKey: ['directory'] })
    await queryClient.invalidateQueries({ queryKey: ['stations'] })
    await queryClient.invalidateQueries({ queryKey: ['audit'] })
  }

  const toggle = useGuardedMutation({
    mutationFn: (u: User) => userApi.setActive(u.id, !u.active),
    onSuccess: async (u) => {
      await refresh()
      toast.success(`${u.fullName} was ${u.active ? 'activated' : 'deactivated'}.`)
      setDialog(null)
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      setDialog(null)
    },
  })

  const sort: SortState = { by: filters.sortBy, dir: filters.dir }
  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Person',
      sortKey: 'fullName',
      minWidth: 'min-w-[12rem]',
      cell: (u) => (
        <div>
          <p className="font-semibold text-stone-900">{u.fullName}</p>
          <p className="text-xs text-stone-600">@{u.username}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortKey: 'role',
      minWidth: 'min-w-[10rem]',
      cell: (u) => (
        <div>
          <p className="font-medium text-stone-900">{u.jobRole.name}</p>
          <p className="text-xs text-stone-600">{ROLE_LABELS[u.role]} access</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      minWidth: 'min-w-[12rem]',
      cell: (u) => (
        <div className="text-sm">
          <p>{u.email ?? <span className="text-stone-400">No email</span>}</p>
          <p className="text-stone-600">{u.phone ?? <span className="text-stone-400">No phone</span>}</p>
        </div>
      ),
    },
    {
      key: 'stations',
      header: 'Stations',
      minWidth: 'min-w-[10rem]',
      cell: (u) =>
        u.role === 'ADMIN' && u.stations.length === 0 ? (
          <span className="text-stone-600">All stations</span>
        ) : u.stations.length === 0 ? (
          <span className="text-amber-800">Not assigned</span>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {u.stations.map((st) => (
              <li key={st.id} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-stone-800" title={st.name}>{st.code}</li>
            ))}
          </ul>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'active',
      cell: (u) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', u.active ? 'bg-green-100 text-green-900 ring-green-300' : 'bg-stone-100 text-stone-700 ring-stone-300')}>
          {u.active ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    { key: 'created', header: 'Created', sortKey: 'createdAt', cell: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      minWidth: 'min-w-[15rem]',
      cell: (u) => {
        const self = u.id === me?.id
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'edit', user: u })} aria-label={`Edit ${u.username}`}>Edit</Button>
            <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'reset', user: u })} aria-label={`Reset password for ${u.username}`}>Reset password</Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={self && u.active}
              title={self && u.active ? 'You cannot deactivate your own account' : undefined}
              onClick={() => setDialog({ kind: 'toggle', user: u })}
              aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.username}`}
            >
              {u.active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <Card>
        <CardHeader
          title="Users"
          description="Everyone who can sign in. Access follows the role they hold."
          actions={<Button onClick={() => setDialog({ kind: 'create' })}><Plus className="size-4" aria-hidden="true" /> New user</Button>}
        />
        <FilterPanel onReset={s.reset} activeCount={activeCount}>
          <SearchInput label="Search" value={s.get('q')} onChange={(v) => s.set({ q: v })} placeholder="Name, username or email" />
          <SelectField label="Role" value={s.get('jobRoleId')} onChange={(e) => s.set({ jobRoleId: e.target.value })}>
            <option value="">All roles</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </SelectField>
          <SelectField label="Access level" value={s.get('role')} onChange={(e) => s.set({ role: e.target.value })}>
            <option value="">Any level</option>
            <option value="ADMIN">Administrator</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="CLERK">Clerk</option>
          </SelectField>
          <SelectField label="Station" value={s.get('stationId')} onChange={(e) => s.set({ stationId: e.target.value })}>
            <option value="">All stations</option>
            {stations.data?.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </SelectField>
          <SelectField label="Status" value={s.get('active')} onChange={(e) => s.set({ active: e.target.value })}>
            <option value="">All users</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </SelectField>
        </FilterPanel>
        <DataTable
          caption="Users"
          columns={columns}
          rows={data?.content}
          rowKey={(u) => u.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle={activeCount > 0 ? 'No users match these filters' : 'No users yet'}
          sort={sort}
          onSortChange={(next) => s.set({ sortBy: next.by, dir: next.dir })}
          pagination={data}
          onPageChange={(page) => s.set({ page })}
          onSizeChange={(size) => s.set({ size })}
          mobileTitle={(u) => u.fullName}
          rowClassName={(u) => (u.active ? undefined : 'opacity-60')}
        />
      </Card>

      {dialog?.kind === 'create' && <UserFormDialog onClose={() => setDialog(null)} onSaved={refresh} />}
      {dialog?.kind === 'edit' && <UserFormDialog user={dialog.user} isSelf={dialog.user.id === me?.id} onClose={() => setDialog(null)} onSaved={refresh} />}
      {dialog?.kind === 'reset' && <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} onSaved={refresh} />}
      {dialog?.kind === 'toggle' && (
        <ConfirmDialog
          open
          title={dialog.user.active ? `Deactivate ${dialog.user.fullName}?` : `Activate ${dialog.user.fullName}?`}
          message={dialog.user.active ? 'They will be signed out immediately and will not be able to sign in again until reactivated.' : 'They will be able to sign in again.'}
          confirmLabel={dialog.user.active ? 'Deactivate' : 'Activate'}
          destructive={dialog.user.active}
          loading={toggle.isPending}
          onConfirm={() => toggle.mutate(dialog.user)}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}

const optionalPhone = z.string().trim().refine((v) => v === '' || /^(\+250|0)7\d{8}$/.test(v), 'Use a Rwandan mobile number, e.g. 0788123456')
const optionalEmail = z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address')

const createSchema = z.object({
  username: z.string().trim().regex(/^[a-z0-9._-]{3,50}$/, '3-50 characters: lowercase letters, digits, dot, dash, underscore'),
  fullName: z.string().trim().min(2, 'Enter the full name').max(120),
  password: z.string().min(10, 'Use at least 10 characters').max(100),
  jobRoleId: z.string().min(1, 'Choose a role'),
  email: optionalEmail,
  phone: optionalPhone,
})
const editSchema = createSchema.extend({ username: z.string(), password: z.string() })
type FormValues = z.infer<typeof createSchema>

function UserFormDialog({ user, isSelf, onClose, onSaved }: { user?: User; isSelf?: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const editing = Boolean(user)
  const roles = useRoles()
  const stations = useAllStations()
  const [serverError, setServerError] = useState<string | null>(null)
  const [stationIds, setStationIds] = useState<Set<number>>(new Set(user?.stations.map((st) => st.id) ?? []))
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: {
      username: user?.username ?? '',
      fullName: user?.fullName ?? '',
      password: '',
      jobRoleId: user ? String(user.jobRole.id) : '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  })

  const toggleStation = (id: number) =>
    setStationIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const mutation = useGuardedMutation({
    mutationFn: async (v: FormValues) => {
      const common = { fullName: v.fullName.trim(), jobRoleId: Number(v.jobRoleId), email: v.email.trim() || undefined, phone: v.phone.trim() || undefined }
      if (!user) {
        return userApi.create({ ...common, username: v.username.trim(), password: v.password, stationIds: [...stationIds] })
      }
      let saved = await userApi.update(user.id, common)
      const before = user.stations.map((st) => st.id).sort().join(',')
      if (before !== [...stationIds].sort().join(',')) {
        saved = await userApi.assignStations(user.id, [...stationIds])
      }
      return saved
    },
    onSuccess: async (saved) => {
      await onSaved()
      toast.success(editing ? `${saved.fullName} was updated.` : `User ${saved.username} created.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['username', 'fullName', 'password', 'jobRoleId', 'email', 'phone'])),
  })
  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    mutation.mutate(v)
  })

  const activeRoles = (roles.data ?? []).filter((r) => r.active || r.id === user?.jobRole.id)
  const chosen = roles.data?.find((r) => String(r.id) === watch('jobRoleId'))

  return (
    <Modal
      open
      onClose={onClose}
      busy={mutation.isPending}
      size="lg"
      title={editing ? `Edit ${user!.username}` : 'New user'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Create user'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Username" required disabled={editing} autoFocus={!editing} error={errors.username?.message} {...register('username')} />
          <TextField label="Full name" required autoFocus={editing} error={errors.fullName?.message} {...register('fullName')} />
        </div>
        {!editing && <TextField label="Initial password" type="password" autoComplete="new-password" required hint="At least 10 characters. Share it securely; reset it anytime." error={errors.password?.message} {...register('password')} />}
        <SelectField label="Role" required disabled={isSelf} hint={isSelf ? 'You cannot change your own role.' : chosen?.description} error={errors.jobRoleId?.message} {...register('jobRoleId')}>
          <option value="">Choose a role...</option>
          {activeRoles.map((r) => <option key={r.id} value={r.id}>{r.name} ({ROLE_LABELS[r.accessLevel]} access)</option>)}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
          <TextField label="Phone" type="tel" inputMode="tel" placeholder="0788123456" error={errors.phone?.message} {...register('phone')} />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-800">Stations they manage</legend>
          <p className="mb-2 text-xs text-stone-600">Assigned users manage these stations and can only see their data. Administrators always see every station.</p>
          {(stations.data ?? []).length === 0 ? (
            <p className="text-sm text-stone-600">No stations registered yet.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {(stations.data ?? []).map((st) => (
                <li key={st.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                    <input type="checkbox" checked={stationIds.has(st.id)} onChange={() => toggleStation(st.id)} className="size-4 accent-brand-600" />
                    <span className="flex-1">{st.name} <span className="font-mono text-xs text-stone-500">{st.code}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}

const resetSchema = z.object({ newPassword: z.string().min(10, 'Use at least 10 characters').max(100) })

function ResetPasswordDialog({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '' } })
  const mutation = useGuardedMutation({
    mutationFn: (v: z.infer<typeof resetSchema>) => userApi.resetPassword(user.id, v.newPassword),
    onSuccess: async () => {
      await onSaved()
      toast.success(`Password reset for ${user.username}. They were signed out everywhere.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['newPassword'])),
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
      title={`Reset password for ${user.username}`}
      description="They will be signed out on every device and must use the new password."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>Reset password</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <TextField label="New password" type="password" autoComplete="new-password" required autoFocus error={errors.newPassword?.message} {...register('newPassword')} />
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
