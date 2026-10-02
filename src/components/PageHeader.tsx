import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} - CherryTrack`
  }, [title])
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <div>
        <h1 className="text-2xl sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
