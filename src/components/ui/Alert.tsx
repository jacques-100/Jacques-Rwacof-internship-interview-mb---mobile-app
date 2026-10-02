import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'info' | 'warning' | 'danger' | 'success'

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-sky-300 bg-sky-50 text-sky-950', icon: Info },
  warning: { box: 'border-amber-400 bg-amber-50 text-amber-950', icon: AlertTriangle },
  danger: { box: 'border-red-400 bg-red-50 text-red-950', icon: XCircle },
  success: { box: 'border-green-400 bg-green-50 text-green-950', icon: CheckCircle2 },
}

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { box, icon: Icon } = TONES[tone]
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border p-3 text-sm', box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  )
}
