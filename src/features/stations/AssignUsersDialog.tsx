import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { stationApi } from '@/api/stationApi'
import { userApi } from '@/api/userApi'
import { qk } from '@/api/queryKeys'
import { ROLE_LABELS } from '@/auth/permissions'
import { LoadingState, errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Station } from '@/lib/types'

/** Chooses who works in a station. Everyone assigned manages it; administrators always see every station. */
export function AssignUsersDialog({ station, onClose }: { station: Station; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<number> | null>(null)
  const [q, setQ] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const detail = useQuery({ queryKey: ['stations', 'detail', station.id], queryFn: () => stationApi.get(station.id) })
  const users = useQuery({ queryKey: qk.users({ picker: true }), queryFn: () => userApi.list({ active: true, size: 100, sortBy: 'fullName' }) })

  useEffect(() => {
    if (detail.data && selected === null) setSelected(new Set(detail.data.users.map((u) => u.id)))
  }, [detail.data, selected])

  const visible = useMemo(
    () =>
      (users.data?.content ?? []).filter((u) => `${u.fullName} ${u.username} ${u.jobRole.name}`.toLowerCase().includes(q.toLowerCase())),
    [users.data, q],
  )

  const mutation = useGuardedMutation({
    mutationFn: () => stationApi.assignUsers(station.id, [...(selected ?? [])]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stations'] })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(`Staff updated for ${station.name}.`)
      onClose()
    },
    onError: (e) => setServerError(errorMessage(e)),
  })

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev ?? [])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const loading = detail.isLoading || users.isLoading || selected === null

  return (
    <Modal
      open
      onClose={onClose}
      busy={mutation.isPending}
      size="lg"
      title={`Staff of ${station.name}`}
      description="People assigned here manage this station and can only work in the stations they are assigned to."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => { setServerError(null); mutation.mutate() }} loading={mutation.isPending} disabled={loading}>
            Save ({selected?.size ?? 0} assigned)
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        {(detail.error || users.error) && <Alert tone="danger">Could not load users. Close this and try again.</Alert>}
        {loading ? (
          <LoadingState label="Loading users..." />
        ) : (
          <>
            <TextField label="Find a person" type="search" placeholder="Name, username or role" value={q} onChange={(e) => setQ(e.target.value)} />
            <fieldset>
              <legend className="sr-only">Users assigned to {station.name}</legend>
              <ul className="max-h-72 divide-y divide-stone-200 overflow-y-auto rounded-md border border-stone-200">
                {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-600">No one matches.</li>}
                {visible.map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
                      <input type="checkbox" checked={selected!.has(u.id)} onChange={() => toggle(u.id)} className="size-4 accent-brand-600" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-stone-900">{u.fullName}</span>
                        <span className="block text-xs text-stone-600">{u.username} · {u.jobRole.name} · {ROLE_LABELS[u.role]} access</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </>
        )}
      </div>
    </Modal>
  )
}
