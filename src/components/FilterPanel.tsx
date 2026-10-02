import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '@/lib/cn'

interface FilterPanelProps {
  children: ReactNode
  onReset?: () => void
  activeCount?: number
  /** Start expanded (filters are always visible on large screens regardless). */
  defaultOpen?: boolean
}

/** Filters are always visible from `lg` up and collapse behind a toggle on small screens. */
export function FilterPanel({ children, onReset, activeCount = 0, defaultOpen = false }: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <div className="border-b border-stone-200 px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-stone-800"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      <div id={panelId} className={cn('mt-3 lg:mt-0 lg:block', open ? 'block' : 'hidden')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{children}</div>
        {onReset && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={onReset} disabled={activeCount === 0}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
