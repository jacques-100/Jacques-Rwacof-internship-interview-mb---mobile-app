import { cn } from '@/lib/cn'
import { useAvatarUrl } from '@/lib/useAvatarUrl'

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-24 text-2xl' } as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** A person's photo, or their initials when they have not added one. Decorative: the name is shown beside it. */
export function Avatar({ user, size = 'md', className }: { user: { id: number; fullName: string; avatarVersion?: number | null }; size?: keyof typeof SIZES; className?: string }) {
  const url = useAvatarUrl(user.id, user.avatarVersion)
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800', SIZES[size], className)}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : initials(user.fullName)}
    </span>
  )
}
