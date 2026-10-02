import { Link } from 'react-router-dom'
import type { Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, formatDateTime, formatKg, formatRwf, formatTime } from '@/lib/format'
import type { Delivery } from '@/lib/types'
import { DeliveryActions } from './DeliveryActions'

const reference: Column<Delivery> = {
  key: 'reference',
  header: 'Reference',
  sortKey: 'reference',
  cell: (d) => (
    <Link to={`/deliveries/${d.id}`} className="font-medium text-brand-700 underline-offset-2 hover:underline">
      {d.reference}
    </Link>
  ),
}

const farmer: Column<Delivery> = {
  key: 'farmer',
  header: 'Farmer',
  cell: (d) => (
    <div>
      <p className="text-stone-900">{d.farmer.fullName}</p>
      <p className="text-xs text-stone-500">{d.farmer.cooperativeNumber}</p>
    </div>
  ),
}

const weight: Column<Delivery> = { key: 'weight', header: 'Weight', sortKey: 'weightKg', align: 'right', cell: (d) => formatKg(d.weightKg) }
const grade: Column<Delivery> = { key: 'grade', header: 'Grade', sortKey: 'grade', cell: (d) => d.grade ?? <span className="text-stone-400">-</span> }
const amount: Column<Delivery> = {
  key: 'amount',
  header: 'Amount',
  sortKey: 'amountOwed',
  align: 'right',
  cell: (d) => (d.amountOwed != null ? formatRwf(d.amountOwed) : <span className="text-stone-400">-</span>),
}
const status: Column<Delivery> = { key: 'status', header: 'Status', sortKey: 'status', cell: (d) => <StatusBadge status={d.status} /> }

/** Full list used by the Deliveries page. */
export function fullColumns(): Column<Delivery>[] {
  return [
    reference,
    { key: 'date', header: 'Date', sortKey: 'deliveryDate', cell: (d) => formatDate(d.deliveryDate) },
    farmer,
    weight,
    grade,
    {
      key: 'price',
      header: 'Price/kg',
      sortKey: 'pricePerKg',
      align: 'right',
      cell: (d) => (d.pricePerKg != null ? formatRwf(d.pricePerKg) : <span className="text-stone-400">-</span>),
    },
    amount,
    status,
    { key: 'createdBy', header: 'Created by', cell: (d) => d.createdBy },
    { key: 'createdAt', header: 'Created at', sortKey: 'createdAt', cell: (d) => formatDateTime(d.createdAt) },
    { key: 'actions', header: 'Actions', cell: (d) => <DeliveryActions delivery={d} showView /> },
  ]
}

/** Narrower list for dashboards, daily intake and queues. */
export function compactColumns(opts: { actions?: boolean } = { actions: true }): Column<Delivery>[] {
  const cols: Column<Delivery>[] = [
    reference,
    farmer,
    weight,
    grade,
    amount,
    status,
    { key: 'time', header: 'Time', sortKey: 'createdAt', cell: (d) => formatTime(d.createdAt) },
  ]
  if (opts.actions !== false) cols.push({ key: 'actions', header: 'Actions', cell: (d) => <DeliveryActions delivery={d} showView /> })
  return cols
}
