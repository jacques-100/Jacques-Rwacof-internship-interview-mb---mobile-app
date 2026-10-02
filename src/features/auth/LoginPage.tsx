import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ClipboardCheck, Gauge, ScrollText } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Logo } from '@/components/layout/Logo'
import { LoadingState, errorMessage } from '@/components/states'

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

const POINTS = [
  { icon: Gauge, title: 'Capacity you can trust', text: 'Intake stops at the daily limit, even when several clerks are weighing at once.' },
  { icon: ClipboardCheck, title: 'Cherry to payment', text: 'Receive, grade and pay each delivery with the price fixed at the moment of grading.' },
  { icon: ScrollText, title: 'Every step on record', text: 'Who did what, and when. Nothing is deleted, so disputes can be settled.' },
]

/** Decorative cherry branch used as the brand panel's backdrop. */
function Branches() {
  return (
    <svg viewBox="0 0 600 700" className="pointer-events-none absolute -right-24 -bottom-10 h-[120%] w-auto opacity-[0.14]" aria-hidden="true">
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <path d="M580 20C460 120 400 230 330 380" />
        <path d="M520 90C470 130 440 190 430 260" />
        <path d="M430 260C400 330 380 400 330 480" />
        <path d="M470 150C380 170 330 230 300 310" />
        <path d="M330 380C290 450 250 520 190 590" />
      </g>
      <g fill="#fff">
        <circle cx="330" cy="500" r="34" />
        <circle cx="282" cy="560" r="30" />
        <circle cx="430" cy="300" r="28" />
        <circle cx="300" cy="340" r="26" />
        <circle cx="190" cy="620" r="30" />
        <circle cx="520" cy="130" r="22" />
      </g>
      <g fill="#c7e0a4">
        <path d="M470 150c30-34 78-38 104-14-22 36-72 44-104 14z" />
        <path d="M330 380c-34-8-66-34-70-66 38-2 72 22 70 66z" />
        <path d="M190 590c-30-10-52-36-52-64 34 2 58 26 52 64z" />
      </g>
    </svg>
  )
}

export function LoginPage() {
  const { login, status, expired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  if (status === 'loading') return <LoadingState label="Checking your session..." />
  if (status === 'authenticated') return <Navigate to={from} replace />

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.username.trim().toLowerCase(), values.password)
      navigate(from, { replace: true })
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="palette-fixed relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-stone-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Branches />
        <Logo light />
        <div className="relative max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-200 uppercase">Coffee washing station platform</p>
          <h2 className="mt-3 font-display text-5xl leading-[1.05] font-semibold text-balance text-white">Every kilo, accounted for.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-[18px] text-brand-200" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm leading-relaxed text-stone-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-stone-400">RWACOF · CherryTrack v1.0</p>
      </aside>

      <main className="flex items-center justify-center bg-stone-50 px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-3xl">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-stone-600">Use the account your station supervisor gave you.</p>

          {expired && !serverError && (
            <Alert tone="warning" className="mb-4" title="Your session expired">
              Please sign in again to continue.
            </Alert>
          )}
          {serverError && (
            <Alert tone="danger" className="mb-4">
              {serverError}
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <TextField label="Username" autoComplete="username" autoFocus required error={errors.username?.message} {...register('username')} />
            <TextField label="Password" type="password" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
            <Button type="submit" className="h-10 w-full text-sm" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
