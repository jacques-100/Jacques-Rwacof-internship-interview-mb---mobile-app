import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, KeyRound, ShieldCheck } from 'lucide-react'
import { brandingApi } from '@/api/brandingApi'
import { Avatar } from '@/components/Avatar'
import { ImageUploader } from '@/components/ImageUploader'
import { AVATAR_SOURCE_MAX_BYTES, squareThumbnail } from '@/lib/imageUpload'
import { authApi } from '@/api/authApi'
import { ROLE_LABELS, humanizePermission } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { formatDate } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120, 'Keep your name under 120 characters'),
  email: z.string().trim().max(160).refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address'),
  phone: z.string().trim().refine((v) => v === '' || /^(\+250|0)7\d{8}$/.test(v), 'Use a Rwandan mobile number, e.g. 0788123456'),
})
type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(10, 'Use at least 10 characters').max(100, 'Use at most 100 characters'),
    confirm: z.string().min(1, 'Repeat the new password'),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The two passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password different from the current one' })
type PasswordValues = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      <PageHeader title="My profile" description="Keep your contact details up to date and change your password whenever you like." />
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <PhotoCard />
          <ProfileForm />
          <PasswordForm />
        </div>
        <Card className="h-fit">
          <CardHeader title="Your access" description="Set by an administrator." />
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Username</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{user.username}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  <ShieldCheck className="size-3.5" aria-hidden="true" /> Role
                </dt>
                <dd className="mt-0.5 text-stone-900">
                  <span className="font-medium">{user.jobRole.name}</span>
                  <span className="block text-stone-600">{ROLE_LABELS[user.role]} access</span>
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  <Building2 className="size-3.5" aria-hidden="true" /> Stations you manage
                </dt>
                <dd className="mt-1">
                  {user.role === 'ADMIN' && <p className="mb-1 text-stone-600">All stations (administrator)</p>}
                  {user.stations.length === 0 ? (
                    user.role === 'ADMIN' ? null : <p className="text-stone-600">None yet. Ask an administrator.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {user.stations.map((s) => (
                        <li key={s.id} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 ring-1 ring-stone-300 ring-inset">
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Permissions</dt>
                <dd className="mt-1">
                  {user.permissions.length === 0 ? (
                    <p className="text-stone-600">View-only access.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {user.permissions.map((p) => (
                        <li key={p} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 ring-1 ring-stone-300 ring-inset">
                          {humanizePermission(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Account created</dt>
                <dd className="mt-0.5 text-stone-900">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  )
}

/** The user's own photo: shown in the header and wherever their name appears. */
function PhotoCard() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  if (!user) return null
  return (
    <Card>
      <CardHeader title="Profile photo" description="Shown next to your name in the header. Colleagues can see it." />
      <CardBody>
        <ImageUploader
          preview={<Avatar user={user} size="lg" />}
          hasImage={user.avatarVersion != null}
          maxBytes={AVATAR_SOURCE_MAX_BYTES}
          prepare={squareThumbnail}
          chooseLabel={user.avatarVersion != null ? 'Change photo' : 'Upload photo'}
          removeLabel="Remove photo"
          hint="PNG, JPEG or WebP. It is cropped to a square and made small automatically."
          onUpload={async (file) => {
            updateUser(await brandingApi.uploadAvatar(file))
            toast.success('Your photo was updated.')
          }}
          onRemove={async () => {
            updateUser(await brandingApi.removeAvatar())
            toast.success('Your photo was removed.')
          }}
        />
      </CardBody>
    </Card>
  )
}

function ProfileForm() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: ProfileValues) => authApi.updateProfile({ fullName: v.fullName.trim(), email: v.email.trim() || undefined, phone: v.phone.trim() || undefined }),
    onSuccess: (saved) => {
      updateUser(saved)
      reset({ fullName: saved.fullName, email: saved.email ?? '', phone: saved.phone ?? '' })
      toast.success('Your profile was saved.')
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['fullName', 'email', 'phone'])),
  })

  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    mutation.mutate(v)
  })

  return (
    <Card>
      <CardHeader title="Contact details" description="Your name appears on records you create; email and phone are optional." />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <TextField label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <TextField label="Phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0788123456" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
            <Button variant="ghost" disabled={!isDirty || mutation.isPending} onClick={() => reset()}>
              Discard
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function PasswordForm() {
  const { applySession } = useAuth()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } })

  const mutation = useGuardedMutation({
    mutationFn: (v: PasswordValues) => authApi.changePassword(v.currentPassword, v.newPassword),
    onSuccess: (session) => {
      applySession(session)
      reset()
      toast.success('Password changed. You were signed out of your other devices.')
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['currentPassword', 'newPassword'])),
  })

  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    mutation.mutate(v)
  })

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-stone-500" aria-hidden="true" /> Change password</span>}
        description="Changing your password signs you out of every other device."
      />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <TextField label="Current password" type="password" autoComplete="current-password" required error={errors.currentPassword?.message} {...register('currentPassword')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New password" type="password" autoComplete="new-password" required hint="At least 10 characters." error={errors.newPassword?.message} {...register('newPassword')} />
            <TextField label="Repeat new password" type="password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm')} />
          </div>
          <Button type="submit" loading={mutation.isPending}>
            Change password
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
