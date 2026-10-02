import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface MetricCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** Colour of the top rule so related tiles are scannable; the label still carries the meaning. */
  accent?: string
  className?: string
}

/** A ledger tile: small caps label, serif figure, coloured top rule. */
export function MetricCard({ label, value, hint, accent, className }: MetricCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-stone-200 bg-white p-4 pt-5 shadow-card', className)}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent ?? 'var(--color-stone-300)' }} />
      <p className="text-[11px] font-semibold tracking-[0.12em] text-stone-500 uppercase">{label}</p>
      <p className="figure mt-1 text-[28px] leading-tight text-stone-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}
