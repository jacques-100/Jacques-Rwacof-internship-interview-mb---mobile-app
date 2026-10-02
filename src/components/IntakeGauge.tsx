import { formatNumber } from '@/lib/format'
import type { AlertLevel } from '@/lib/types'

interface IntakeGaugeProps {
  acceptedKg: number
  limitKg: number
  utilizationPercent: number
  alert: AlertLevel
}

const COLORS: Record<AlertLevel, string> = { NONE: 'var(--color-brand-600)', LOW: 'var(--color-amber-600)', FULL: 'var(--color-red-600)' }

const W = 420
const CX = W / 2
const CY = 176
const R = 124

/** Point on the dial for a 0..1 fraction (0 = far left, 1 = far right, sweeping over the top). */
function point(fraction: number, radius: number): [number, number] {
  const angle = Math.PI * (1 - fraction)
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)]
}

/**
 * A weighbridge-style dial for the day's intake: a scale arc with tick marks every 5% of the limit,
 * labelled at quarters, and a needle. Purely presentational: the readout lives in HTML next to it.
 */
export function IntakeGauge({ acceptedKg, limitKg, utilizationPercent, alert }: IntakeGaugeProps) {
  const fraction = Math.min(1, Math.max(0, acceptedKg / limitKg))
  const color = COLORS[alert]
  const [sx, sy] = point(0, R)
  const [ex, ey] = point(1, R)
  const [fx, fy] = point(fraction, R)
  const [nx, ny] = point(fraction, R - 30)

  const ticks = Array.from({ length: 21 }, (_, i) => {
    const f = i / 20
    const major = i % 5 === 0
    const [x1, y1] = point(f, R + 14)
    const [x2, y2] = point(f, R + (major ? 27 : 21))
    const [lx, ly] = point(f, R + 42)
    return { f, major, x1, y1, x2, y2, lx, ly }
  })

  return (
    <div
      role="progressbar"
      aria-label="Daily intake capacity used"
      aria-valuemin={0}
      aria-valuemax={limitKg}
      aria-valuenow={acceptedKg}
      aria-valuetext={`${formatNumber(acceptedKg)} of ${formatNumber(limitKg)} kilograms, ${utilizationPercent} percent`}
    >
      <svg viewBox={`0 0 ${W} 200`} className="mx-auto w-full max-w-[380px]" aria-hidden="true">
        <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`} fill="none" stroke="var(--color-stone-200)" strokeWidth="20" />
        {fraction > 0 && (
          <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${fx} ${fy}`} fill="none" stroke={color} strokeWidth="20" className="transition-all duration-700" />
        )}
        {ticks.map((t) => (
          <g key={t.f}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? 'var(--color-stone-700)' : 'var(--color-stone-400)'} strokeWidth={t.major ? 2 : 1} />
            {t.major && (
              <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--color-stone-600)" className="tabular">
                {formatNumber(Math.round(limitKg * t.f))}
              </text>
            )}
          </g>
        ))}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--color-stone-900)" strokeWidth="3.5" strokeLinecap="round" className="transition-all duration-700" />
        <circle cx={CX} cy={CY} r="9" fill="var(--color-stone-900)" />
        <circle cx={CX} cy={CY} r="3.5" fill="var(--color-stone-50)" />
      </svg>
    </div>
  )
}
