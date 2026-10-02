import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Block Esc/backdrop dismissal while a request is running. */
  busy?: boolean
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

/**
 * Built on the native <dialog>: the browser provides the focus trap, Esc handling, inert background
 * and focus restoration. We only add the title association and backdrop-click dismissal.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current && !busy) onClose()
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-2rem)] flex-col rounded-lg open:flex border border-stone-200 bg-white p-0 text-stone-900 shadow-pop backdrop:bg-black/50',
        WIDTHS[size],
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-stone-600">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
          className="-m-1 rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">{footer}</div>}
    </dialog>
  )
}
