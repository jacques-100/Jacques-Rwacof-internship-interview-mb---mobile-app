import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { stationApi } from '@/api/stationApi'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Station } from '@/lib/types'
import { useSystemSettings } from '@/settings/SystemSettingsContext'

const ZONES = ['Africa/Kigali', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Bujumbura', 'Africa/Addis_Ababa', 'UTC']

const decimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7

const schema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9]{2,10}$/, 'Use 2-10 letters or digits, no spaces'),
    name: z.string().trim().min(3, 'Give the station a name').max(120, 'Keep the name under 120 characters'),
    location: z.string().trim().max(160, 'Keep the location under 160 characters'),
    timezone: z.string().trim().min(1, 'Enter a time zone'),
    dailyCapacityKg: z.number({ invalid_type_error: 'Enter the daily capacity' }).gt(0, 'Must be greater than 0').refine(decimals, 'At most 2 decimal places'),
    maxDeliveryKg: z.number({ invalid_type_error: 'Enter the largest single delivery' }).gt(0, 'Must be greater than 0').refine(decimals, 'At most 2 decimal places'),
    lowThresholdKg: z.number({ invalid_type_error: 'Enter the warning level' }).min(0, 'Cannot be negative').refine(decimals, 'At most 2 decimal places'),
    active: z.boolean(),
  })
  .refine((v) => v.maxDeliveryKg <= v.dailyCapacityKg, { path: ['maxDeliveryKg'], message: 'Cannot exceed the daily capacity' })
  .refine((v) => v.lowThresholdKg <= v.dailyCapacityKg, { path: ['lowThresholdKg'], message: 'Cannot exceed the daily capacity' })
type FormValues = z.infer<typeof schema>

export function StationFormDialog({ station, onClose }: { station?: Station; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(station)
  const { stationDefaults: defaults } = useSystemSettings()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: station?.code ?? '',
      name: station?.name ?? '',
      location: station?.location ?? '',
      timezone: station?.timezone ?? defaults.timezone,
      dailyCapacityKg: station?.dailyCapacityKg ?? defaults.dailyCapacityKg,
      maxDeliveryKg: station?.maxDeliveryKg ?? defaults.maxDeliveryKg,
      lowThresholdKg: station?.lowThresholdKg ?? defaults.lowThresholdKg,
      active: station?.active ?? true,
    },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = { ...v, code: v.code.trim().toUpperCase(), name: v.name.trim(), location: v.location.trim() || undefined, timezone: v.timezone.trim(), active: editing ? v.active : undefined }
      return station ? stationApi.update(station.id, input) : stationApi.create(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['stations'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `${saved.name} was updated.` : `${saved.name} registered. Assign staff to it next.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['code', 'name', 'location', 'timezone', 'dailyCapacityKg', 'maxDeliveryKg', 'lowThresholdKg'])),
  })

  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    mutation.mutate(v)
  })

  return (
    <Modal
      open
      onClose={onClose}
      busy={mutation.isPending}
      size="lg"
      title={editing ? `Edit ${station!.name}` : 'Register a station'}
      description={editing ? 'Capacity changes apply to new days. To change a day that has already started, use Daily Intake.' : 'Each station has its own capacity, deliveries and staff.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>{editing ? 'Save changes' : 'Register station'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Code" required disabled={editing} autoFocus={!editing} placeholder="e.g. NDB" hint={editing ? 'Fixed once created.' : 'Used in delivery references.'} error={errors.code?.message} fieldClassName="sm:col-span-1" {...register('code')} />
          <TextField label="Station name" required autoFocus={editing} placeholder="e.g. Nduba Washing Station" error={errors.name?.message} fieldClassName="sm:col-span-2" {...register('name')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Location" placeholder="Sector, district" error={errors.location?.message} {...register('location')} />
          <div>
            <TextField label="Time zone" required list="station-zones" error={errors.timezone?.message} hint="Decides what 'today' means here." {...register('timezone')} />
            <datalist id="station-zones">{ZONES.map((z) => <option key={z} value={z} />)}</datalist>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Daily capacity (kg)" type="number" step="0.01" inputMode="decimal" required hint="Accepted weight per day." error={errors.dailyCapacityKg?.message} {...register('dailyCapacityKg', { valueAsNumber: true })} />
          <TextField label="Largest delivery (kg)" type="number" step="0.01" inputMode="decimal" required hint="Per single delivery." error={errors.maxDeliveryKg?.message} {...register('maxDeliveryKg', { valueAsNumber: true })} />
          <TextField label="Low-capacity warning (kg)" type="number" step="0.01" inputMode="decimal" required hint="Warn when this much is left." error={errors.lowThresholdKg?.message} {...register('lowThresholdKg', { valueAsNumber: true })} />
        </div>
        {editing && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" {...register('active')} />
            <span>
              <span className="font-medium">Active</span>
              <span className="block text-stone-600">Inactive stations cannot receive deliveries and are hidden from the station switcher.</span>
            </span>
          </label>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
