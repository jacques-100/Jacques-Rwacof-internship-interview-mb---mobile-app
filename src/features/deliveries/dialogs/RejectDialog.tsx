import { useState } from 'react'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { deliveryApi } from '@/api/deliveryApi'
import { deliveryRelated } from '@/api/queryKeys'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import type { Delivery } from '@/lib/types'
import { useSystemSettings } from '@/settings/SystemSettingsContext'
import { DeliverySummary } from '../DeliverySummary'

const schema = z.object({
  reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(500, 'Keep the reason under 500 characters'),
})
type FormValues = z.infer<typeof schema>

export function RejectDialog({ delivery, open, onClose }: { delivery: Delivery; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { rejectionReasons } = useSystemSettings()
  const [confirming, setConfirming] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => deliveryApi.reject(delivery.id, v.reason.trim()),
    onSuccess: async () => {
      await Promise.all(deliveryRelated.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })))
      toast.success(`${delivery.reference} was rejected.`)
      onClose()
    },
    onError: (e) => {
      setConfirming(false)
      setServerError(applyServerError(e, setError, ['reason']))
    },
  })

  const review = handleSubmit(() => {
    setServerError(null)
    setConfirming(true)
  })
  const confirm = handleSubmit((v) => mutation.mutate(v))

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={mutation.isPending}
      title={confirming ? 'Reject this delivery?' : 'Reject delivery'}
      description={confirming ? undefined : 'A reason is required. The weight is released from the daily capacity.'}
      footer={
        confirming ? (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={mutation.isPending}>
              Back
            </Button>
            <Button variant="danger" onClick={confirm} loading={mutation.isPending}>
              Reject delivery
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={review}>
              Continue
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <DeliverySummary delivery={delivery} />
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        {confirming ? (
          <>
            <Alert tone="warning" title="This action cannot be reversed.">
              The delivery becomes immutable: it can no longer be corrected, graded or paid.
            </Alert>
            <p className="text-sm text-stone-700">
              <span className="font-medium">Reason:</span> {watch('reason').trim()}
            </p>
          </>
        ) : (
          <form onSubmit={review} noValidate className="space-y-4">
            {rejectionReasons.length > 0 && (
              <SelectField
                label="Common reasons"
                hint="Pick one to fill the reason below, then edit it if needed."
                value=""
                onChange={(e) => e.target.value && setValue('reason', e.target.value, { shouldValidate: true, shouldDirty: true })}
              >
                <option value="">Choose a common reason...</option>
                {rejectionReasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </SelectField>
            )}
            <TextAreaField
              label="Rejection reason"
              required
              autoFocus
              placeholder="e.g. Unripe cherries, excess moisture"
              error={errors.reason?.message}
              {...register('reason')}
            />
          </form>
        )}
      </div>
    </Modal>
  )
}
