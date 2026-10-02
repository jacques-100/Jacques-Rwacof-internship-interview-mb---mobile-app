import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useBranding } from '@/lib/useBranding'

/** The CherryTrack mark: two cherries on one stem with a leaf, on a cherry-red tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#a11d3b" />
      <path d="M20 9c-2 6-6 10-9 15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M20 9c2 6 6 11 8 16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="10.5" cy="28" r="5.6" fill="#fff" />
      <circle cx="28.5" cy="29" r="5.6" fill="#fbe4e8" />
      <path d="M20 9c3.5-4.5 9-5 12-2.5-2.5 4.5-8.5 5.5-12 2.5z" fill="#c7e0a4" />
    </svg>
  )
}

export function Logo({ light = false, className, subtitle = 'Washing Station' }: { light?: boolean; className?: string; subtitle?: string }) {
  const { logoUrl, organizationName } = useBranding()
  const [broken, setBroken] = useState<string | null>(null)
  const custom = logoUrl !== null && broken !== logoUrl
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {custom ? (
        // The company's own logo, on a white tile so any logo stays readable on the dark sidebar too.
        <span className="flex h-10 shrink-0 items-center rounded-lg bg-[#ffffff] px-1.5 ring-1 ring-black/10">
          <img src={logoUrl ?? undefined} alt="" onError={() => setBroken(logoUrl)} className="max-h-8 max-w-[6rem] object-contain" />
        </span>
      ) : (
        <LogoMark />
      )}
      <div className="min-w-0 leading-none">
        {custom && organizationName ? (
          <p className={cn('truncate font-display text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-stone-900')}>{organizationName}</p>
        ) : (
          <p className={cn('font-display text-[19px] font-semibold tracking-tight', light ? 'text-white' : 'text-stone-900')}>
            Cherry<span className={light ? 'text-brand-300' : 'text-brand-600'}>Track</span>
          </p>
        )}
        <p className={cn('mt-1 truncate text-[10px] font-medium tracking-[0.14em] uppercase', light ? 'text-stone-400' : 'text-stone-500')}>
          {custom ? 'CherryTrack' : subtitle}
        </p>
      </div>
    </div>
  )
}
