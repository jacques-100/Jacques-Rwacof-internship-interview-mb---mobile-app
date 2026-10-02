import { cn } from '@/lib/cn'
import { formatKg, formatPercent } from '@/lib/format'
import type { AlertLevel } from '@/lib/types'
import { IntakeGauge } from './IntakeGauge'

interface CapacityProgressProps {
  acceptedKg: number
  limitKg: number
  remainingKg: number
  utilizationPercent: number
  alert: AlertLevel
  /** `lg` renders the weighbridge dial; `md` a compact bar for forms. */
  size?: 'md' | 'lg'
}

const BAR: Record<AlertLevel, string> = {
  NONE: 'bg-brand-600',
  LOW: 'bg-amber-600',
  FULL: 'bg-red-700',
}

const TEXT: Record<AlertLevel, string> = {
  NONE: 'text-stone-900',
  LOW: 'text-amber-800',
  FULL: 'text-red-800',
}

export function CapacityProgress({ acceptedKg, limitKg, remainingKg, utilizationPercent, alert, size = 'md' }: CapacityProgressProps) {
  if (size === 'lg') {
    return (
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,380px)_1fr]">
        <IntakeGauge acceptedKg={acceptedKg} limitKg={limitKg} utilizationPercent={utilizationPercent} alert={alert} />
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-stone-500 uppercase">Accepted today</p>
          <p className={cn('figure mt-1 text-5xl', TEXT[alert])}>
            {formatKg(acceptedKg)} <span className="font-sans text-base font-normal text-stone-600">of {formatKg(limitKg)} accepted</span>
          </p>
          <dl className="tabular mt-5 grid grid-cols-2 gap-4 border-t border-stone-200 pt-4">
            <div>
              <dt className="text-xs text-stone-500">Remaining</dt>
              <dd className="figure text-2xl">{formatKg(remainingKg)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Capacity used</dt>
              <dd className="figure text-2xl">{formatPercent(utilizationPercent)}</dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  const pct = Math.min(100, Math.max(0, utilizationPercent))
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="figure text-xl text-stone-900">
          {formatKg(acceptedKg)} <span className="font-sans text-sm font-normal text-stone-600">of {formatKg(limitKg)} accepted</span>
        </p>
        <p className="tabular text-sm font-medium text-stone-700">{formatPercent(utilizationPercent)} used</p>
      </div>
      <div
        role="progressbar"
        aria-label="Daily intake capacity used"
        aria-valuemin={0}
        aria-valuemax={limitKg}
        aria-valuenow={acceptedKg}
        aria-valuetext={`${formatKg(acceptedKg)} of ${formatKg(limitKg)} (${formatPercent(utilizationPercent)})`}
        className="h-3 w-full overflow-hidden rounded-full bg-stone-200"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', BAR[alert])} style={{ width: `${pct}%` }} />
      </div>
      <p className="tabular mt-2 text-sm text-stone-600">{formatKg(remainingKg)} remaining</p>
    </div>
  )
}
