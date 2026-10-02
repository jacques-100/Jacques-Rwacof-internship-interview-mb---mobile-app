import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { dashboardApi } from '@/api/dashboardApi'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { formatDate, formatKg } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Capacity } from '@/lib/types'

/**
 * Raises or lowers the intake limit for one day, for example when extra drying beds are available.
 * It can never go below what has already been accepted, needs a reason, and is recorded in the audit log.
 */
export function AdjustCapacityDialog({ capacity, onClose }: { capacity: Capacity; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    limitKg: z
      .number({ invalid_type_error: 'Enter the new limit in kg' })
      .gt(0, 'The limit must be greater than 0')
      .max(9_999_999, 'That limit is unreasonably high')
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most 2 decimal places')
      .refine((v) => v >= capacity.acceptedKg, `Cannot be lower than the ${formatKg(capacity.acceptedKg)} already accepted`),
    reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(300, 'Keep the reason under 300 characters'),
  })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { limitKg: capacity.dailyLimitKg, reason: '' } })
  const next = watch('limitKg')
  const changed = Number.isFinite(next) && next !== capacity.dailyLimitKg

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => dashboardApi.adjustCapacity(capacity.date, v.limitKg, v.reason.trim()),
    onSuccess: async () => {
      for (const key of ['capacity', 'capacity-preview', 'dashboard', 'audit']) {
        await queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(`Capacity for ${formatDate(capacity.date)} is now ${formatKg(next)}.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['limitKg', 'reason'])),
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
      title={`Adjust capacity for ${formatDate(capacity.date)}`}
      description="Only this day changes. The station's default for other days stays the same."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending} disabled={!changed}>Save new limit</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <dl className="grid grid-cols-3 gap-3 rounded-md bg-stone-50 p-3 text-sm">
          <div><dt className="text-xs text-stone-500">Current limit</dt><dd className="figure text-lg">{formatKg(capacity.dailyLimitKg)}</dd></div>
          <div><dt className="text-xs text-stone-500">Accepted so far</dt><dd className="figure text-lg">{formatKg(capacity.acceptedKg)}</dd></div>
          <div><dt className="text-xs text-stone-500">Remaining</dt><dd className="figure text-lg">{formatKg(capacity.remainingKg)}</dd></div>
        </dl>
        <TextField label="New limit (kg)" type="number" step="0.01" inputMode="decimal" required autoFocus error={errors.limitKg?.message} {...register('limitKg', { valueAsNumber: true })} />
        {changed && Number.isFinite(next) && (
          <p className="tabular text-sm text-stone-700" aria-live="polite">
            {next > capacity.dailyLimitKg ? 'Adds' : 'Removes'} {formatKg(Math.abs(Math.round((next - capacity.dailyLimitKg) * 100) / 100))} of headroom; {formatKg(Math.max(0, next - capacity.acceptedKg))} would remain.
          </p>
        )}
        <TextAreaField label="Reason" required placeholder="e.g. Extra drying beds available today" error={errors.reason?.message} {...register('reason')} />
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
