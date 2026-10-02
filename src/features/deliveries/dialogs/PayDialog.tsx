import { useState } from 'react'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useQueryClient } from '@tanstack/react-query'
import { deliveryApi } from '@/api/deliveryApi'
import { deliveryRelated } from '@/api/queryKeys'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/components/states'
import { formatRwf } from '@/lib/format'
import type { Delivery } from '@/lib/types'
import { DeliverySummary } from '../DeliverySummary'

export function PayDialog({ delivery, open, onClose }: { delivery: Delivery; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmed, setConfirmed] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useGuardedMutation({
    mutationFn: () => deliveryApi.pay(delivery.id),
    onSuccess: async () => {
      await Promise.all(deliveryRelated.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })))
      toast.success(`${delivery.reference} marked as paid (${formatRwf(delivery.amountOwed)}).`)
      onClose()
    },
    onError: (e) => setServerError(errorMessage(e)),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={mutation.isPending}
      title="Confirm payment"
      description="Marking a delivery as paid is final. It cannot be edited afterwards."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!confirmed} loading={mutation.isPending}>
            Mark as paid
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <DeliverySummary delivery={delivery} />
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <label className="flex items-start gap-3 rounded-md border border-stone-300 p-3 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
          <span>
            I confirm that <strong className="tabular">{formatRwf(delivery.amountOwed)}</strong> has been paid to {delivery.farmer.fullName}.
          </span>
        </label>
      </div>
    </Modal>
  )
}
