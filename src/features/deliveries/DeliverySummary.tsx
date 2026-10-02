import { formatDate, formatKg, formatRwf } from '@/lib/format'
import type { Delivery } from '@/lib/types'

/** Compact facts about a delivery, shown at the top of every workflow dialog. */
export function DeliverySummary({ delivery }: { delivery: Delivery }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-stone-50 p-3 text-sm">
      <Item label="Delivery" value={delivery.reference} />
      <Item label="Date" value={formatDate(delivery.deliveryDate)} />
      <Item label="Farmer" value={delivery.farmer.fullName} />
      <Item label="Weight" value={formatKg(delivery.weightKg)} />
      {delivery.grade && <Item label="Grade" value={`Grade ${delivery.grade}`} />}
      {delivery.pricePerKg != null && <Item label="Price per kg" value={formatRwf(delivery.pricePerKg)} />}
      {delivery.amountOwed != null && <Item label="Amount owed" value={formatRwf(delivery.amountOwed)} strong />}
    </dl>
  )
}

function Item({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={strong ? 'tabular font-semibold text-stone-900' : 'tabular text-stone-900'}>{value}</dd>
    </div>
  )
}
