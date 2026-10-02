import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { LoadingState } from '@/components/states'
import { can, type Capability } from './permissions'
import { useAuth } from './AuthContext'

/** Redirects unauthenticated visitors to /login, remembering where they were headed. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <LoadingState label="Checking your session..." />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Renders a "no access" screen (rather than a blank page) when the role lacks the capability. */
export function RequireCapability({ capability }: { capability: Capability }) {
  const { user } = useAuth()
  if (!can(user, capability)) return <Forbidden />
  return <Outlet />
}

export function Forbidden() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <ShieldAlert className="size-10 text-amber-700" aria-hidden="true" />
      <h1 className="text-xl">You don't have access to this page</h1>
      <p className="text-sm text-stone-600">Your role does not include this area. If you think this is a mistake, ask an administrator.</p>
      <Link to="/" className="text-sm font-medium text-brand-700 underline">
        Back to the dashboard
      </Link>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl">Page not found</h1>
      <p className="text-sm text-stone-600">The page you are looking for doesn't exist or has moved.</p>
      <Link to="/" className="text-sm font-medium text-brand-700 underline">
        Back to the dashboard
      </Link>
    </div>
  )
}
