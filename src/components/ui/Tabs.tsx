import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: string
  /** Optional small count shown next to the label. */
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the tab list. */
  label: string
}

/**
 * Accessible tabs: a tablist with roving focus and arrow/Home/End keys. Pair with {@link TabPanel}.
 * Panel ids derive from the tab ids so screen readers can associate them.
 */
export function Tabs({ tabs, value, onChange, label }: TabsProps) {
  const base = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(index + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1) }
  }

  return (
    <div role="tablist" aria-label={label} className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-300">
      {tabs.map((tab, i) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[tab.id] = el }}
            id={`${base}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
              selected ? 'border-brand-600 text-brand-800' : 'border-transparent text-stone-600 hover:border-stone-400 hover:text-stone-900',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn('tabular rounded-full px-2 py-0.5 text-xs', selected ? 'bg-brand-100 text-brand-800' : 'bg-stone-200 text-stone-700')}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Renders its children only while its tab is selected (so hidden tabs don't fetch data). */
export function TabPanel({ id, value, children }: { id: string; value: string; children: ReactNode }) {
  if (id !== value) return null
  return (
    <div role="tabpanel" tabIndex={0} aria-label={id} className="outline-offset-4">
      {children}
    </div>
  )
}
