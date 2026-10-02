import { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/lib/hooks'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

/** Debounced search box: typing updates locally, the parent is notified after a short pause. */
export function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search' }: SearchInputProps) {
  const id = useId()
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, 350)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  useEffect(() => {
    setText(value)
  }, [value])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-stone-300 bg-white pr-8 pl-8 text-sm placeholder:text-stone-400 hover:border-stone-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText('')
              onChange('')
            }}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-stone-500 hover:bg-stone-100"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
