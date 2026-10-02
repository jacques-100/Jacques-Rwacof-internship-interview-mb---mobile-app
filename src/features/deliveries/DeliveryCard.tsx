import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, formatKg, formatRwf, formatTime } from '@/lib/format'
import type { Delivery } from '@/lib/types'
import { DeliveryActions } from './DeliveryActions'

/**
 * One delivery as a phone-sized card: who, how much, what state, what is owed. The whole top area opens
 * the details; the buttons underneath are only the actions the server allows right now.
 */
export function DeliveryCard({ delivery: d, actions = true }: { delivery: Delivery; actions?: boolean }) {
  return (
    <div className="space-y-2">
      <Link to={`/deliveries/${d.id}`} className="block rounded-md active:bg-stone-100" aria-label={`Open ${d.reference}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-stone-900">{d.farmer.fullName}</p>
            <p className="truncate text-xs text-stone-600">{d.reference}</p>
            <p className="text-xs text-stone-600">
              {formatDate(d.deliveryDate)}, {formatTime(d.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={d.status} />
            <ChevronRight className="size-4 text-stone-400" aria-hidden="true" />
          </div>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">Weight</dt>
            <dd className="tabular font-semibold text-stone-900">{formatKg(d.weightKg)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">Grade</dt>
            <dd className="font-semibold text-stone-900">{d.grade ?? <span className="font-normal text-stone-400">Not graded</span>}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">Amount</dt>
            <dd className="tabular font-semibold text-stone-900">{d.amountOwed != null ? formatRwf(d.amountOwed) : <span className="font-normal text-stone-400">-</span>}</dd>
          </div>
        </dl>
      </Link>
      {actions && d.allowedActions.length > 0 && <DeliveryActions delivery={d} />}
    </div>
  )
}
