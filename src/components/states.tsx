import type { ReactNode } from 'react'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { ApiError } from '@/api/client'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-stone-600">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export function ErrorState({ error, onRetry, title = 'Could not load this data' }: { error?: unknown; onRetry?: () => void; title?: string }) {
  const correlationId = error instanceof ApiError ? error.correlationId : undefined
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <AlertCircle className="size-8 text-red-700" aria-hidden="true" />
      <div>
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-600">{errorMessage(error)}</p>
        {correlationId && <p className="mt-1 text-xs text-stone-500">Reference: {correlationId}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Inbox className="size-8 text-stone-400" aria-hidden="true" />
      <p className="font-semibold text-stone-800">{title}</p>
      {description && <p className="max-w-md text-sm text-stone-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
