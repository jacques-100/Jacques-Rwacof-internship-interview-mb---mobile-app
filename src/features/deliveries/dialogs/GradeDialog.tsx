import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { deliveryApi } from '@/api/deliveryApi'
import { gradeApi } from '@/api/gradeApi'
import { pricingApi } from '@/api/pricingApi'
import { deliveryRelated, qk } from '@/api/queryKeys'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { applyServerError } from '@/lib/forms'
import { formatKg, formatRwf } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Delivery } from '@/lib/types'
import { DeliverySummary } from '../DeliverySummary'

const schema = z.object({
  grade: z.string().min(1, 'Choose a grade'),
  moisture: z
    .string()
    .refine(
      (v) => v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100 && Math.abs(Number(v) * 10 - Math.round(Number(v) * 10)) < 1e-7),
      'Enter a percentage from 0 to 100 with at most one decimal',
    ),
  notes: z.string().max(500, 'Keep the notes under 500 characters'),
})
type FormValues = z.infer<typeof schema>

/**
 * The grading form: pick one of the station's configured grades, optionally record moisture and
 * notes. The price is shown for orientation; the server resolves it and calculates the amount.
 */
export function GradeDialog({ delivery, open, onClose }: { delivery: Delivery; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const grades = useQuery({ queryKey: qk.grades(true), queryFn: () => gradeApi.list(true), enabled: open })
  const prices = useQuery({ queryKey: qk.prices, queryFn: pricingApi.list, enabled: open })

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { grade: '', moisture: '', notes: '' } })

  const selected = watch('grade')
  const price = selected ? prices.data?.current.find((p) => p.grade === selected) : undefined
  const chosen = grades.data?.find((g) => g.code === selected)
  // Display-only estimate. The server computes and stores the authoritative amount.
  const estimate = price ? Math.round(delivery.weightKg * price.pricePerKg * 100) / 100 : undefined
  const loading = grades.isLoading || prices.isLoading
  const loadError = grades.error ?? prices.error

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) =>
      deliveryApi.grade(delivery.id, {
        grade: v.grade,
        moisturePercent: v.moisture.trim() === '' ? undefined : Number(v.moisture),
        notes: v.notes.trim() === '' ? undefined : v.notes.trim(),
      }),
    onSuccess: async (updated) => {
      await Promise.all(deliveryRelated.map((key) => queryClient.invalidateQueries({ queryKey: [...key] })))
      toast.success(`${delivery.reference} graded ${updated.grade}: ${formatRwf(updated.amountOwed)} owed.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['grade', 'moisturePercent', 'notes'])),
  })

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    mutation.mutate(values)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={mutation.isPending}
      title="Grade delivery"
      description="Choose the grade and record what you saw. The amount owed is calculated by the server from the current price."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selected || !price} loading={mutation.isPending}>
            {selected ? `Grade ${selected}` : 'Select a grade'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <DeliverySummary delivery={delivery} />
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        {loadError && <Alert tone="danger">Could not load grades and prices. Close this and try again.</Alert>}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-800">
            Grade <span aria-hidden="true" className="text-red-700">*</span>
          </legend>
          {!loading && grades.data?.length === 0 && <Alert tone="warning">No grade is switched on. A supervisor can add one under Prices &amp; Grades.</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            {(grades.data ?? []).map((g) => {
              const p = prices.data?.current.find((x) => x.grade === g.code)
              const isSelected = selected === g.code
              return (
                <label
                  key={g.code}
                  className={cn(
                    'flex flex-col rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600',
                    p ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                    isSelected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-stone-300 hover:border-stone-400',
                  )}
                >
                  <input type="radio" value={g.code} disabled={!p} className="sr-only" {...register('grade')} />
                  <span className="font-semibold">{g.name}</span>
                  {g.description && <span className="text-xs text-stone-600">{g.description}</span>}
                  <span className="tabular mt-1 text-sm text-stone-700">{loading ? 'Loading price...' : p ? `${formatRwf(p.pricePerKg)} / kg` : 'No price set'}</span>
                </label>
              )
            })}
          </div>
          {errors.grade && <p role="alert" className="mt-1 text-xs font-medium text-red-700">{errors.grade.message}</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Moisture (%)"
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="e.g. 11.5"
            hint="Optional"
            error={errors.moisture?.message}
            fieldClassName="sm:col-span-1"
            {...register('moisture')}
          />
          <TextAreaField label="Notes" placeholder="Colour, uniformity, defects..." hint="Optional" error={errors.notes?.message} fieldClassName="sm:col-span-2" {...register('notes')} />
        </div>

        {selected && price && estimate !== undefined && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3" aria-live="polite">
            <p className="tabular text-sm text-stone-700">
              {chosen?.name}: {formatKg(delivery.weightKg)} × {formatRwf(price.pricePerKg)}/kg
            </p>
            <p className="figure mt-1 text-2xl text-stone-900">{formatRwf(estimate)}</p>
          </div>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
