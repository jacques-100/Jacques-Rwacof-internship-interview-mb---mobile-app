import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { dashboardApi } from '@/api/dashboardApi'
import { qk } from '@/api/queryKeys'
import { can } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { formatKg } from '@/lib/format'

interface Item {
  id: string
  text: string
  to: string
}

/** Notifications are derived from live backend data (capacity and workflow queues), never fabricated. */
export function NotificationsMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useQuery({ queryKey: qk.dashboard(), queryFn: () => dashboardApi.get(), refetchInterval: 60_000 })

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items: Item[] = []
  if (data) {
    const c = data.capacity
    if (c.alert === 'FULL') items.push({ id: 'cap', text: 'Daily intake capacity reached.', to: '/daily-intake' })
    else if (c.alert === 'LOW') items.push({ id: 'cap', text: `Daily intake capacity is nearly reached (${formatKg(c.remainingKg)} left).`, to: '/daily-intake' })
    if (c.statusCounts.RECEIVED > 0) items.push({ id: 'grade', text: `${c.statusCounts.RECEIVED} delivery(ies) awaiting grading.`, to: '/grading' })
    if (can(user, 'viewPayments') && c.statusCounts.GRADED > 0) {
      items.push({ id: 'pay', text: `${c.statusCounts.GRADED} graded delivery(ies) awaiting payment.`, to: '/payments' })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${items.length ? `, ${items.length} new` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-stone-600 hover:bg-stone-100"
      >
        <Bell className="size-5" aria-hidden="true" />
        {items.length > 0 && (
          <span aria-hidden="true" className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-stone-200 bg-white shadow-pop">
          <p className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-600">You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((i) => (
                <li key={i.id}>
                  <Link to={i.to} onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-stone-800 hover:bg-stone-50">
                    {i.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
