import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { directoryApi } from '@/api/directoryApi'
import { ROLE_LABELS, can } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { ErrorState, LoadingState, errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { JobRole, PermissionDef } from '@/lib/types'
import { useRoles } from './lookups'

type Draft = Record<number, Set<string>>

/**
 * The permission matrix: every permission the system knows against every role. Ticking a box changes what
 * everyone holding that role may do, from their very next request. The Administrator role is locked so
 * the system can never be locked out of its own administration.
 */
export function PermissionsTab() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const editable = can(user, 'managePermissions')
  const roles = useRoles()
  const catalogue = useQuery({ queryKey: ['directory', 'permissions'], queryFn: directoryApi.permissions, staleTime: 5 * 60_000 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const active = useMemo(() => (roles.data ?? []).filter((r) => r.active), [roles.data])

  // (Re)load the draft whenever the saved roles change.
  useEffect(() => {
    if (roles.data) setDraft(Object.fromEntries(roles.data.map((r) => [r.id, new Set(r.permissions)])))
  }, [roles.data])

  const groups = useMemo(() => {
    const byGroup = new Map<string, PermissionDef[]>()
    for (const p of catalogue.data ?? []) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p])
    return [...byGroup.entries()]
  }, [catalogue.data])

  const locked = (role: JobRole) => role.systemRole && role.accessLevel === 'ADMIN'
  const changed = (role: JobRole) => {
    const now = draft?.[role.id]
    if (!now) return false
    const saved = new Set(role.permissions)
    return now.size !== saved.size || [...now].some((p) => !saved.has(p))
  }
  const dirtyRoles = active.filter(changed)

  const toggle = (role: JobRole, code: string) =>
    setDraft((prev) => {
      const next = new Set(prev?.[role.id] ?? [])
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return { ...(prev ?? {}), [role.id]: next }
    })

  const save = useGuardedMutation({
    mutationFn: async () => {
      for (const role of dirtyRoles) {
        await directoryApi.updateRolePermissions(role.id, [...(draft?.[role.id] ?? [])])
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['directory'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(`Permissions updated for ${dirtyRoles.length} role${dirtyRoles.length === 1 ? '' : 's'}. They apply on each person's next request.`)
    },
    onError: async (e) => {
      setServerError(errorMessage(e))
      await queryClient.invalidateQueries({ queryKey: ['directory'] })   // show what really got saved
    },
  })

  if (roles.isLoading || catalogue.isLoading || !draft) return <LoadingState label="Loading permissions..." />
  if (roles.error || catalogue.error) {
    return <Card><ErrorState error={roles.error ?? catalogue.error} onRetry={() => { void roles.refetch(); void catalogue.refetch() }} /></Card>
  }

  return (
    <Card>
      <CardHeader
        title="Permissions"
        description="What each role is allowed to do. Viewing dashboards, deliveries, farmers and prices needs no permission, only a station."
        actions={
          editable ? (
            <>
              <Button variant="ghost" disabled={dirtyRoles.length === 0 || save.isPending} onClick={() => { setServerError(null); setDraft(Object.fromEntries((roles.data ?? []).map((r) => [r.id, new Set(r.permissions)]))) }}>
                Discard changes
              </Button>
              <Button disabled={dirtyRoles.length === 0} loading={save.isPending} onClick={() => { setServerError(null); save.mutate() }}>
                Save changes{dirtyRoles.length > 0 ? ` (${dirtyRoles.length})` : ''}
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="space-y-3 px-4 py-3 sm:px-5">
        {!editable && <Alert tone="info">You can see what each role holds, but changing permissions needs the "Manage permissions" permission.</Alert>}
        {serverError && <Alert tone="danger">{serverError}</Alert>}
      </div>
      <div className="max-h-[75vh] overflow-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Permissions held by each role</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-20 min-w-[18rem] border-b border-stone-300 bg-stone-100 px-4 py-3 text-left text-xs font-semibold tracking-wider text-stone-700 uppercase">
                Permission
              </th>
              {active.map((role) => (
                <th key={role.id} scope="col" className="sticky top-0 z-10 min-w-[8.5rem] border-b border-stone-300 bg-stone-100 px-3 py-3 text-center">
                  <span className="block text-sm font-semibold text-stone-900">{role.name}</span>
                  <span className="block text-[11px] font-normal text-stone-600">{ROLE_LABELS[role.accessLevel]} level · {role.users} {role.users === 1 ? 'person' : 'people'}</span>
                  {locked(role) && <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-stone-600"><Lock className="size-3" aria-hidden="true" /> Fixed</span>}
                  {changed(role) && <span className="mt-0.5 block text-[11px] font-semibold text-brand-700">Unsaved changes</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([group, perms]) => (
              <Fragment key={group}>
                <tr>
                  <th scope="colgroup" colSpan={active.length + 1} className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-left text-[11px] font-semibold tracking-[0.14em] text-stone-600 uppercase">
                    {group}
                  </th>
                </tr>
                {perms.map((p) => (
                  <tr key={p.code} className="hover:bg-brand-50/40">
                    <th scope="row" className="sticky left-0 z-10 border-b border-stone-200/80 bg-white px-4 py-2.5 text-left font-normal">
                      <span className="block font-medium text-stone-900">{p.label}</span>
                      <span className="block text-xs text-stone-600">{p.description}</span>
                    </th>
                    {active.map((role) => {
                      const checked = draft[role.id]?.has(p.code) ?? false
                      const savedHeld = role.permissions.includes(p.code)
                      const disabled = !editable || locked(role) || save.isPending
                      return (
                        <td key={role.id} className={cn('border-b border-stone-200/80 px-3 py-2.5 text-center', checked !== savedHeld && 'bg-amber-50')}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(role, p.code)}
                            aria-label={`${role.name}: ${p.label}`}
                            className="size-4 accent-brand-600 disabled:opacity-60"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
