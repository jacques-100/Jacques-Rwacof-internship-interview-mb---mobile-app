import { cn } from '@/lib/cn'
import type { DeliveryStatus } from '@/lib/types'

const STYLES: Record<DeliveryStatus, string> = {
  RECEIVED: 'bg-amber-100 text-amber-900 ring-amber-300',
  GRADED: 'bg-sky-100 text-sky-900 ring-sky-300',
  PAID: 'bg-green-100 text-green-900 ring-green-300',
  REJECTED: 'bg-red-100 text-red-900 ring-red-300',
}

const LABELS: Record<DeliveryStatus, string> = {
  RECEIVED: 'Received',
  GRADED: 'Graded',
  PAID: 'Paid',
  REJECTED: 'Rejected',
}

/** Status is conveyed by text, not colour alone. */
export function StatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STYLES[status], className)}>
      {LABELS[status]}
    </span>
  )
}

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  RECEIVED: '#b45309',
  GRADED: '#0369a1',
  PAID: '#15803d',
  REJECTED: '#b91c1c',
}

export const STATUS_LABELS = LABELS
