import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { Delivery, DeliveryAction } from '@/lib/types'
import { CorrectWeightDialog } from './dialogs/CorrectWeightDialog'
import { GradeDialog } from './dialogs/GradeDialog'
import { PayDialog } from './dialogs/PayDialog'
import { RejectDialog } from './dialogs/RejectDialog'

interface DeliveryActionsProps {
  delivery: Delivery
  /** Show a "View" link to the details page (used in tables). */
  showView?: boolean
  size?: 'sm' | 'md'
}

/**
 * Renders only the actions the backend says are allowed for this delivery and the current role
 * (`allowedActions`), so a button is never offered that the server would refuse.
 */
export function DeliveryActions({ delivery, showView = false, size = 'sm' }: DeliveryActionsProps) {
  const [active, setActive] = useState<DeliveryAction | null>(null)
  const allowed = new Set(delivery.allowedActions)
  const close = () => setActive(null)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showView && (
        <Link
          to={`/deliveries/${delivery.id}`}
          className="inline-flex h-8 items-center rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          aria-label={`View ${delivery.reference}`}
        >
          View
        </Link>
      )}
      {allowed.has('GRADE') && (
        <Button size={size} onClick={() => setActive('GRADE')} aria-label={`Grade ${delivery.reference}`}>
          Grade
        </Button>
      )}
      {allowed.has('CORRECT_WEIGHT') && (
        <Button size={size} variant="secondary" onClick={() => setActive('CORRECT_WEIGHT')} aria-label={`Correct weight of ${delivery.reference}`}>
          Correct weight
        </Button>
      )}
      {allowed.has('REJECT') && (
        <Button size={size} variant="secondary" onClick={() => setActive('REJECT')} aria-label={`Reject ${delivery.reference}`} className="text-red-800">
          Reject
        </Button>
      )}
      {allowed.has('PAY') && (
        <Button size={size} onClick={() => setActive('PAY')} aria-label={`Mark ${delivery.reference} as paid`}>
          Mark as paid
        </Button>
      )}

      {/* Dialogs mount only while open, so their form state resets every time. */}
      {active === 'CORRECT_WEIGHT' && <CorrectWeightDialog delivery={delivery} open onClose={close} />}
      {active === 'GRADE' && <GradeDialog delivery={delivery} open onClose={close} />}
      {active === 'REJECT' && <RejectDialog delivery={delivery} open onClose={close} />}
      {active === 'PAY' && <PayDialog delivery={delivery} open onClose={close} />}
    </div>
  )
}
