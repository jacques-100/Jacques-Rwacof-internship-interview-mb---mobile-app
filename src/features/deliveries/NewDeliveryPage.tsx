import { useEffect, useMemo, useState } from 'react'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { dashboardApi } from '@/api/dashboardApi'
import { deliveryApi } from '@/api/deliveryApi'
import { deliveryRelated, qk } from '@/api/queryKeys'
import { CapacityProgress } from '@/components/CapacityProgress'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { formatKg } from '@/lib/format'
import { stationToday } from '@/lib/format'
import { useStation } from '@/station/StationContext'
import { FarmerPicker } from '../farmers/FarmerPicker'

function makeSchema(maxKg: number) {
  return z.object({
  farmerId: z.string().min(1, 'Select a farmer'),
  deliveryDate: z.string().min(1, 'Choose the delivery date'),
  weightKg: z
    .number({ invalid_type_error: 'Enter the weight in kilograms' })
    .gt(0, 'Weight must be greater than 0 kg')
    .max(maxKg, `A single delivery cannot exceed ${maxKg} kg at this station`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most 2 decimal places'),
  })
}
type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function NewDeliveryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const today = stationToday()
  const { station } = useStation()
  const maxKg = station?.maxDeliveryKg ?? 500
  const schema = useMemo(() => makeSchema(maxKg), [maxKg])
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { farmerId: '', deliveryDate: today } })

  // The farmer is chosen through the picker, so the form field is registered by hand.
  useEffect(() => {
    register('farmerId')
  }, [register])

  const date = watch('deliveryDate')
  const weight = watch('weightKg')
  const dateValid = Boolean(date) && date <= today

  const { data: capacity, isLoading: capacityLoading } = useQuery({
    queryKey: qk.capacityPreview(date),
    queryFn: () => dashboardApi.capacityPreview(date),
    enabled: dateValid,
  })

  const weightValid = Number.isFinite(weight) && weight > 0
  const after = capacity && weightValid ? capacity.acceptedKg + weight : undefined
  const exceeds = after !== undefined && capacity !== undefined && after > capacity.dailyLimitKg + 1e-9
  const utilization = capacity ? Math.min(100, (capacity.acceptedKg / capacity.dailyLimitKg) * 100) : 0

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => deliveryApi.create({ farmerId: Number(v.farmerId), deliveryDate: v.deliveryDate, weightKg: v.weightKg }),
    onSuccess: async (created) => {
      await Promise.all(deliveryRelated.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })))
      toast.success(`Delivery ${created.reference} recorded.`)
      navigate(`/deliveries/${created.id}`)
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['farmerId', 'deliveryDate', 'weightKg'])),
  })

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    mutation.mutate(values)
  })

  return (
    <>
      <PageHeader title="Record new delivery" description="Grade and amount are added later in the workflow, so they are not asked for here." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Delivery details" />
          <CardBody>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {serverError && <Alert tone="danger">{serverError}</Alert>}
              <FarmerPicker error={errors.farmerId?.message} onSelect={(f) => setValue('farmerId', f ? String(f.id) : '', { shouldValidate: true })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Delivery date" type="date" required max={today} error={errors.deliveryDate?.message ?? (date > today ? 'Delivery date cannot be in the future' : undefined)} {...register('deliveryDate')} />
                <TextField
                  label="Weight (kg)"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 120.5"
                  hint={`Greater than 0 and at most ${maxKg} kg`}
                  error={errors.weightKg?.message}
                  {...register('weightKg', { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <Button type="submit" className="w-full sm:w-auto" loading={mutation.isPending} disabled={exceeds || !dateValid}>
                  Record delivery
                </Button>
                <Link to="/deliveries" className="inline-flex h-9 items-center rounded-md border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
                  Cancel
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Daily capacity" description={dateValid ? `For ${date}` : 'Choose a valid date'} />
          <CardBody className="space-y-4" aria-live="polite">
            {!dateValid && <p className="text-sm text-stone-600">Pick a delivery date that is not in the future to see capacity.</p>}
            {dateValid && capacityLoading && <p className="text-sm text-stone-600">Checking capacity...</p>}
            {capacity && (
              <>
                <CapacityProgress
                  acceptedKg={capacity.acceptedKg}
                  limitKg={capacity.dailyLimitKg}
                  remainingKg={capacity.remainingKg}
                  utilizationPercent={Math.round(utilization * 10) / 10}
                  alert={capacity.remainingKg <= 0 ? 'FULL' : 'NONE'}
                />
                <dl className="tabular space-y-2 rounded-md bg-stone-50 p-3 text-sm">
                  <Row label="Current accepted" value={formatKg(capacity.acceptedKg)} />
                  <Row label="New delivery" value={weightValid ? formatKg(weight) : '-'} />
                  <Row label="After this delivery" value={after !== undefined ? formatKg(after) : '-'} strong />
                  <Row label="Remaining after" value={after !== undefined ? formatKg(Math.max(0, capacity.dailyLimitKg - after)) : formatKg(capacity.remainingKg)} />
                  <Row label="Daily capacity" value={formatKg(capacity.dailyLimitKg)} />
                </dl>
                {exceeds && (
                  <Alert tone="danger" title="This would exceed the daily capacity">
                    Only {formatKg(capacity.remainingKg)} can still be accepted for this date.
                  </Alert>
                )}
                <p className="text-xs text-stone-500">This preview is a guide. The server makes the final capacity check when you submit.</p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-600">{label}</dt>
      <dd className={strong ? 'font-semibold text-stone-900' : 'text-stone-900'}>{value}</dd>
    </div>
  )
}
