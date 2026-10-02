import { useEffect, useId, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, UserCheck } from 'lucide-react'
import { farmerApi } from '@/api/farmerApi'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Farmer } from '@/lib/types'

/**
 * Searchable farmer selection for phones: type a name, phone or cooperative number and the server
 * returns the best matches (never thousands of rows). Only active farmers can receive deliveries.
 */
export function FarmerPicker({ onSelect, error }: { onSelect: (farmer: Farmer | null) => void; error?: string }) {
  const inputId = useId()
  const listId = `${inputId}-list`
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<Farmer | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 250)
    return () => clearTimeout(t)
  }, [text])

  const { data, isFetching, error: loadError, refetch } = useQuery({
    queryKey: ['farmers', 'picker', debounced],
    queryFn: () => farmerApi.list({ q: debounced, active: true, size: 20, sortBy: 'fullName', dir: 'asc' }),
    placeholderData: keepPreviousData,
    enabled: !selected,
    staleTime: 30_000,
  })

  const choose = (farmer: Farmer | null) => {
    setSelected(farmer)
    onSelect(farmer)
    if (!farmer) setText('')
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-stone-800">
          Farmer <span aria-hidden="true" className="text-red-700">*</span>
        </span>
        <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-brand-50 p-3" data-testid="selected-farmer">
          <UserCheck className="size-6 shrink-0 text-brand-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-stone-900">{selected.fullName}</p>
            <p className="truncate text-sm text-stone-600">{selected.cooperativeNumber} · {selected.phone}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => choose(null)} aria-label="Change farmer">
            Change
          </Button>
        </div>
      </div>
    )
  }

  const results = data?.content ?? []
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
        Farmer <span aria-hidden="true" className="text-red-700">*</span>
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error) || undefined}
          autoComplete="off"
          placeholder="Search farmers"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={cn('h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm', error ? 'border-red-600' : 'border-stone-300')}
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Matching farmers" className="max-h-52 overflow-y-auto rounded-md border border-stone-200 bg-white">
        {results.map((f) => (
          <li key={f.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => choose(f)}
              className="flex min-h-14 w-full flex-col items-start justify-center gap-0.5 border-b border-stone-100 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50 active:bg-brand-50"
            >
              <span className="text-sm font-semibold text-stone-900">{f.fullName}</span>
              <span className="text-xs text-stone-600">{f.cooperativeNumber} · {f.phone}</span>
            </button>
          </li>
        ))}
        {!loadError && !isFetching && results.length === 0 && (
          <li className="px-3 py-4 text-sm text-stone-600">{debounced ? `No active farmer matches "${debounced}".` : 'No active farmers yet.'}</li>
        )}
        {isFetching && results.length === 0 && <li className="px-3 py-4 text-sm text-stone-600">Searching...</li>}
        {loadError && (
          <li className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-red-800">
            Could not load farmers.
            <Button type="button" size="sm" variant="secondary" onClick={() => void refetch()}>
              Retry
            </Button>
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
