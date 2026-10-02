import { useMemo, useState } from 'react'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { dashboardApi } from '@/api/dashboardApi'
import { deliveryApi } from '@/api/deliveryApi'
import { deliveryRelated, qk } from '@/api/queryKeys'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { formatKg } from '@/lib/format'
import type { Delivery } from '@/lib/types'
import { useStation } from '@/station/StationContext'
import { DeliverySummary } from '../DeliverySummary'

function makeSchema(maxKg: number) {
  return z.object({
  newWeightKg: z
    .number({ invalid_type_error: 'Enter the corrected weight' })
    .gt(0, 'Weight must be greater than 0 kg')
    .max(maxKg, `Weight cannot exceed ${maxKg} kg at this station`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most 2 decimal places'),
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(300, 'Keep the reason under 300 characters'),
  })
}
type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function CorrectWeightDialog({ delivery, open, onClose }: { delivery: Delivery; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { station } = useStation()
  const schema = useMemo(() => makeSchema(station?.maxDeliveryKg ?? 500), [station?.maxDeliveryKg])
  const [confirming, setConfirming] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  const { data: capacity } = useQuery({
    queryKey: qk.capacityPreview(delivery.deliveryDate),
    queryFn: () => dashboardApi.capacityPreview(delivery.deliveryDate),
    enabled: open,
  })

  const newWeight = watch('newWeightKg')
  const reason = watch('reason')
  const valid = Number.isFinite(newWeight)
  const change = valid ? newWeight - delivery.weightKg : 0
  const overCapacity = capacity != null && change > capacity.remainingKg

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => deliveryApi.correctWeight(delivery.id, v.newWeightKg, v.reason.trim()),
    onSuccess: async () => {
      await Promise.all(deliveryRelated.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })))
      toast.success(`Weight corrected for ${delivery.reference}.`)
      onClose()
    },
    onError: (e) => {
      setConfirming(false)
      setServerError(applyServerError(e, setError, ['newWeightKg', 'reason']))
    },
  })

  const review = handleSubmit((values) => {
    if (values.newWeightKg === delivery.weightKg) {
      setError('newWeightKg', { message: 'The new weight is the same as the current weight' })
      return
    }
    setServerError(null)
    setConfirming(true)
  })

  const confirm = handleSubmit((values) => mutation.mutate(values))

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={mutation.isPending}
      title={confirming ? 'Confirm weight correction' : 'Correct weight'}
      description={confirming ? 'Check the change before saving. It is recorded in the audit log.' : 'Only deliveries that are still RECEIVED can be corrected.'}
      footer={
        confirming ? (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={mutation.isPending}>
              Back
            </Button>
            <Button onClick={confirm} loading={mutation.isPending}>
              Confirm correction
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={review}>Review change</Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <DeliverySummary delivery={delivery} />
        {serverError && <Alert tone="danger">{serverError}</Alert>}

        {confirming ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-stone-200 p-3">
                <p className="text-xs text-stone-500">Current</p>
                <p className="tabular text-lg font-semibold">{formatKg(delivery.weightKg)}</p>
              </div>
              <div className="rounded-md border border-brand-300 bg-brand-50 p-3">
                <p className="text-xs text-stone-600">New</p>
                <p className="tabular text-lg font-semibold">{formatKg(newWeight)}</p>
              </div>
            </div>
            <p className="text-sm text-stone-700">
              <span className="font-medium">Reason:</span> {reason.trim()}
            </p>
          </div>
        ) : (
          <form onSubmit={review} noValidate className="space-y-4">
            <TextField
              label="New weight (kg)"
              type="number"
              step="0.01"
              inputMode="decimal"
              required
              autoFocus
              error={errors.newWeightKg?.message}
              {...register('newWeightKg', { valueAsNumber: true })}
            />
            {capacity && valid && (
              <p className="tabular text-sm text-stone-600">
                Change: {change >= 0 ? '+' : ''}
                {formatKg(Math.round(change * 100) / 100)} · Remaining capacity that day: {formatKg(capacity.remainingKg)}
              </p>
            )}
            {overCapacity && (
              <Alert tone="warning">This correction would exceed the daily capacity. The server will refuse it.</Alert>
            )}
            <TextAreaField
              label="Reason"
              required
              placeholder="e.g. Scale correction after verification"
              error={errors.reason?.message}
              {...register('reason')}
            />
          </form>
        )}
      </div>
    </Modal>
  )
}
