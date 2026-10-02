import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, type RegisterOptions } from 'react-hook-form'
import { brandingApi } from '@/api/brandingApi'
import { dashboardApi } from '@/api/dashboardApi'
import { qk } from '@/api/queryKeys'
import { settingsApi } from '@/api/settingsApi'
import { ROLE_LABELS, can, humanizePermission } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { ImageUploader } from '@/components/ImageUploader'
import { ThemeChoice } from '@/theme/ThemeControls'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingState, errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatKg } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { SettingDefinition } from '@/lib/types'
import { LOGO_MAX_BYTES } from '@/lib/imageUpload'
import { BRANDING_KEY, useBranding } from '@/lib/useBranding'
import { useSystemSettings } from '@/settings/SystemSettingsContext'
import { useStation } from '@/station/StationContext'

type Values = Record<string, string>

/** React Hook Form treats dots in names as nesting, so setting keys ("currency.code") get a safe field name. */
const fieldName = (key: string) => key.replace(/\./g, '__')

function rulesFor(def: SettingDefinition): RegisterOptions<Values, string> {
  const required = { value: true, message: `${def.label} is required` }
  switch (def.type) {
    case 'CURRENCY':
      return { required, validate: (v) => /^[A-Za-z]{3}$/.test(v.trim()) || 'Use a three-letter code such as RWF' }
    case 'DECIMAL':
      return { required, validate: (v) => (Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v.trim())) || 'Enter a number above 0 with at most 2 decimals' }
    case 'INTEGER':
      return { required, validate: (v) => (/^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 3660) || 'Enter a whole number from 1 to 3660' }
    case 'TEXT_LIST':
      return { validate: (v) => v.split('\n').every((l) => l.length <= 100) || 'Each line can be at most 100 characters' }
    default:
      return { required, maxLength: { value: 80, message: 'Keep it under 80 characters' } }
  }
}

export function SettingsPage() {
  const { user } = useAuth()
  const { station, status } = useStation()
  const { values, definitions, isLoading } = useSystemSettings()
  const { data, error, refetch } = useQuery({ queryKey: qk.settings, queryFn: dashboardApi.settings, enabled: status === 'ready' })
  const canEdit = can(user, 'manageSettings')

  return (
    <>
      <PageHeader
        title="Settings"
        description="System-wide settings are stored in the database and used throughout the application. Below them: the station you are working in and your account."
      />
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Appearance" description="Light, dark, or follow this device. This is saved on this device only, so each person (and each phone) can choose their own." />
            <CardBody>
              <ThemeChoice />
            </CardBody>
          </Card>
          <LogoCard canEdit={canEdit} />
          {isLoading || definitions.length === 0 ? (
            <LoadingState label="Loading settings..." />
          ) : (
            <SettingsForm key={JSON.stringify(values)} definitions={definitions} values={values} canEdit={canEdit} />
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title={station ? station.name : 'Station'}
              description={
                can(user, 'manageStations') ? (
                  <>Limits are edited on the <Link to="/stations" className="font-medium text-brand-700 underline">Stations</Link> page.</>
                ) : (
                  'Limits are set by an administrator.'
                )
              }
            />
            <CardBody>
              {status !== 'ready' && <p className="text-sm text-stone-600">No station selected.</p>}
              {error && <ErrorState error={error} onRetry={() => void refetch()} />}
              {data && (
                <dl className="space-y-3 text-sm">
                  <Row label="Code" value={data.stationCode} />
                  <Row label="Time zone" value={data.timezone} />
                  <Row label="Today" value={formatDate(data.today)} />
                  <Row label="Daily capacity" value={formatKg(data.dailyLimitKg)} />
                  <Row label="Largest delivery" value={formatKg(data.singleDeliveryMaxKg)} />
                  <Row label="Low-capacity warning" value={`${formatKg(data.lowThresholdKg)} left`} />
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="My account" description={<>Edit your details on <Link to="/profile" className="font-medium text-brand-700 underline">My profile</Link>.</>} />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Row label="Name" value={user?.fullName ?? '-'} />
                <Row label="Username" value={user?.username ?? '-'} />
                <Row label="Role" value={user ? `${user.jobRole.name} (${ROLE_LABELS[user.role]} access)` : '-'} />
                <Row label="Email" value={user?.email ?? 'Not set'} />
                <Row label="Phone" value={user?.phone ?? 'Not set'} />
              </dl>
              {user && user.permissions.length > 0 && (
                <div className="mt-4 border-t border-stone-200 pt-3">
                  <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">You are allowed to</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {user.permissions.map((p) => (
                      <li key={p} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-800 ring-1 ring-stone-300 ring-inset">
                        {humanizePermission(p)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

/** The company logo: stored in the database and shown in the sidebar and on the sign-in page. */
function LogoCard({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { logoUrl, hasLogo, organizationName } = useBranding()
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: BRANDING_KEY }), queryClient.invalidateQueries({ queryKey: ['audit'] })])
  return (
    <Card>
      <CardHeader title="Company logo" description="Appears in the sidebar and on the sign-in page. Upload a new one whenever it changes." />
      <CardBody>
        <ImageUploader
          disabled={!canEdit}
          hasImage={hasLogo}
          maxBytes={LOGO_MAX_BYTES}
          preview={
            <span className="flex h-24 w-40 items-center justify-center rounded-lg border border-stone-200 bg-[#ffffff] p-2">
              {logoUrl ? <img src={logoUrl} alt={`${organizationName ?? 'Company'} logo`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-stone-500">No logo yet</span>}
            </span>
          }
          chooseLabel={hasLogo ? 'Replace logo' : 'Upload logo'}
          removeLabel="Remove logo"
          hint={canEdit ? 'PNG, JPEG or WebP up to 2 MB. A wide logo on a transparent background works best.' : 'Changing the logo needs the "Manage system settings" permission.'}
          onUpload={async (file) => {
            await brandingApi.uploadLogo(file)
            await refresh()
            toast.success('Company logo updated.')
          }}
          onRemove={async () => {
            await brandingApi.removeLogo()
            await refresh()
            toast.success('Company logo removed.')
          }}
        />
      </CardBody>
    </Card>
  )
}

function SettingsForm({ definitions, values, canEdit }: { definitions: SettingDefinition[]; values: Values; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const defaults = useMemo<Values>(() => Object.fromEntries(definitions.map((d) => [fieldName(d.key), values[d.key] ?? d.defaultValue])), [definitions, values])
  const groups = useMemo(() => {
    const byGroup = new Map<string, SettingDefinition[]>()
    for (const d of definitions) byGroup.set(d.group, [...(byGroup.get(d.group) ?? []), d])
    return [...byGroup.entries()]
  }, [definitions])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ defaultValues: defaults })

  const mutation = useGuardedMutation({
    mutationFn: (form: Values) => {
      const changed: Values = {}
      for (const d of definitions) {
        const next = (form[fieldName(d.key)] ?? '').trim()
        if (next !== (values[d.key] ?? d.defaultValue)) changed[d.key] = next
      }
      return settingsApi.update(changed)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success('Settings saved.')
    },
    onError: (e) => setServerError(errorMessage(e)),
  })

  const onSubmit = handleSubmit((form) => {
    setServerError(null)
    mutation.mutate(form)
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {!canEdit && <Alert tone="info">You can see the current settings. Changing them needs the "Manage system settings" permission.</Alert>}
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      {groups.map(([group, defs]) => (
        <Card key={group}>
          <CardHeader title={group} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {defs.map((d) => {
              const name = fieldName(d.key)
              const error = errors[name]?.message
              if (d.type === 'TEXT_LIST') {
                return <TextAreaField key={d.key} label={d.label} hint={d.description} disabled={!canEdit} rows={7} fieldClassName="sm:col-span-2" error={error} {...register(name, rulesFor(d))} />
              }
              const numeric = d.type === 'DECIMAL' || d.type === 'INTEGER'
              return (
                <TextField
                  key={d.key}
                  label={d.label}
                  hint={d.description}
                  disabled={!canEdit}
                  error={error}
                  type={numeric ? 'number' : 'text'}
                  step={d.type === 'DECIMAL' ? '0.01' : undefined}
                  list={d.type === 'TIMEZONE' ? 'setting-zones' : undefined}
                  maxLength={d.type === 'CURRENCY' ? 3 : undefined}
                  className={d.type === 'CURRENCY' ? 'uppercase' : undefined}
                  {...register(name, rulesFor(d))}
                />
              )
            })}
          </CardBody>
        </Card>
      ))}
      <datalist id="setting-zones">
        {['Africa/Kigali', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Bujumbura', 'Africa/Addis_Ababa', 'UTC'].map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      {canEdit && (
        <div className="flex gap-2">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>Save settings</Button>
          <Button variant="ghost" disabled={!isDirty || mutation.isPending} onClick={() => { setServerError(null); reset(defaults) }}>Discard changes</Button>
        </div>
      )}
    </form>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-stone-600">{label}</dt>
      <dd className="col-span-2 text-stone-900">{value}</dd>
    </div>
  )
}
