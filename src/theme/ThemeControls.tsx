import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme, type ThemePreference } from './ThemeContext'

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, hint: 'Bright, warm parchment' },
  { value: 'dark', label: 'Dark', icon: Moon, hint: 'Easier on the eyes at night' },
  { value: 'system', label: 'System', icon: Monitor, hint: 'Match this device' },
]

/** The full choice, for Settings: three radio cards. */
export function ThemeChoice() {
  const { preference, setPreference } = useTheme()
  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
              selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-stone-300 bg-white hover:border-stone-400',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Icon className="size-4" aria-hidden="true" /> {label}
            </span>
            <span className="text-xs text-stone-600">{hint}</span>
          </button>
        )
      })}
    </div>
  )
}

/** One-tap switch for the header: flips to the opposite of what is showing. */
export function ThemeQuickToggle({ className }: { className?: string }) {
  const { resolved, setPreference } = useTheme()
  const toDark = resolved === 'light'
  const Icon = toDark ? Moon : Sun
  return (
    <button
      type="button"
      onClick={() => setPreference(toDark ? 'dark' : 'light')}
      aria-label={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
      title={toDark ? 'Dark mode' : 'Light mode'}
      className={cn('flex size-9 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100', className)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
