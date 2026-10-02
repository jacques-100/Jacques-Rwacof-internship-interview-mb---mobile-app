import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { gradeApi } from '@/api/gradeApi'
import { pricingApi } from '@/api/pricingApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { FilterPanel } from '@/components/FilterPanel'
import { ErrorState, LoadingState } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import { currencyCode, formatDateTime, formatRwf, toIsoDate } from '@/lib/format'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import type { Price } from '@/lib/types'

export function PricesTab({ canManage }: { canManage: boolean }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const prices = useQuery({ queryKey: qk.prices, queryFn: pricingApi.list })
  const grades = useQuery({ queryKey: qk.grades(false), queryFn: () => gradeApi.list(false) })
  const active = useMemo(() => (grades.data ?? []).filter((g) => g.active), [grades.data])

  const history = useMemo(() => {
    return (prices.data?.history ?? []).filter((p) => {
      const day = toIsoDate(new Date(p.effectiveFrom))
      return (!gradeFilter || p.grade === gradeFilter) && (!from || day >= from) && (!to || day <= to)
    })
  }, [prices.data, gradeFilter, from, to])
  const activeFilters = [gradeFilter, from, to].filter(Boolean).length

  const columns: Column<Price>[] = [
    { key: 'grade', header: 'Grade', minWidth: 'min-w-[6rem]', cell: (p) => <span className="font-semibold">{p.grade}</span> },
    { key: 'price', header: 'Price per kg', align: 'right', cell: (p) => formatRwf(p.pricePerKg) },
    { key: 'effective', header: 'Effective from', cell: (p) => formatDateTime(p.effectiveFrom) },
    { key: 'by', header: 'Set by', cell: (p) => p.createdBy ?? 'system' },
    { key: 'created', header: 'Recorded', cell: (p) => formatDateTime(p.createdAt) },
    {
      key: 'state',
      header: 'State',
      cell: (p) =>
        p.current ? (
          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900 ring-1 ring-green-300 ring-inset">Current</span>
        ) : new Date(p.effectiveFrom) > new Date() ? (
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-300 ring-inset">Scheduled</span>
        ) : (
          <span className="text-stone-500">Superseded</span>
        ),
    },
  ]

  if (prices.isLoading || grades.isLoading) return <LoadingState label="Loading prices..." />
  if (prices.error || grades.error || !prices.data) {
    return <Card><ErrorState error={prices.error ?? grades.error} onRetry={() => { void prices.refetch(); void grades.refetch() }} /></Card>
  }

  return (
    <>
      <section aria-label="Current prices" className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {active.length === 0 && <Alert tone="warning" className="sm:col-span-2 xl:col-span-3">No grade is switched on. Add one in the Grades tab first.</Alert>}
        {active.map((g) => {
          const p = prices.data.current.find((x) => x.grade === g.code)
          return (
            <Card key={g.code}>
              <CardBody>
                <p className="text-sm font-semibold text-stone-700">{g.name} <span className="font-normal text-stone-500">({g.code})</span></p>
                {p ? (
                  <>
                    <p className="figure mt-1 text-3xl">
                      {formatRwf(p.pricePerKg)}
                      <span className="font-sans text-base font-normal text-stone-600"> / kg</span>
                    </p>
                    <p className="mt-2 text-xs text-stone-600">Effective {formatDateTime(p.effectiveFrom)} · set by {p.createdBy ?? 'system'}</p>
                    <p className="text-xs text-stone-600">Last updated {formatDateTime(p.createdAt)}</p>
                  </>
                ) : (
                  <Alert tone="warning" className="mt-2">No price yet: deliveries cannot be graded {g.code} until one is set.</Alert>
                )}
                {canManage && (
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => setEditing(g.code)} aria-label={`Set price for ${g.name}`}>
                    {p ? 'Change price' : 'Set price'}
                  </Button>
                )}
              </CardBody>
            </Card>
          )
        })}
      </section>

      <Card>
        <CardHeader
          title="Price history"
          description="Every price ever set, newest first."
          actions={canManage && active.length > 0 ? <Button onClick={() => setEditing(active[0].code)}>Set a price</Button> : undefined}
        />
        <FilterPanel
          activeCount={activeFilters}
          onReset={() => { setGradeFilter(''); setFrom(''); setTo('') }}
        >
          <SelectField label="Grade" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">All grades</option>
            {(grades.data ?? []).map((g) => <option key={g.code} value={g.code}>{g.name} ({g.code})</option>)}
          </SelectField>
          <DatePicker label="Effective from" value={from} max={to || undefined} onChange={setFrom} />
          <DatePicker label="Effective until" value={to} min={from || undefined} onChange={setTo} />
        </FilterPanel>
        <DataTable
          caption="Price history"
          columns={columns}
          rows={history}
          rowKey={(p) => p.id}
          emptyTitle={activeFilters > 0 ? 'No prices match these filters' : 'No prices recorded'}
          mobileTitle={(p) => `Grade ${p.grade}`}
        />
      </Card>

      {editing && <PriceDialog initialGrade={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

const schema = z.object({
  grade: z.string().min(1, 'Choose a grade'),
  pricePerKg: z
    .number({ invalid_type_error: 'Enter the new price per kg' })
    .gt(0, 'Price must be greater than 0')
    .max(1_000_000, 'Price is unreasonably high')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most 2 decimal places'),
  effectiveFrom: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function PriceDialog({ initialGrade, onClose }: { initialGrade: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: grades } = useQuery({ queryKey: qk.grades(true), queryFn: () => gradeApi.list(true) })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { grade: initialGrade, effectiveFrom: '' } })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => pricingApi.create(v.grade, v.pricePerKg, v.effectiveFrom ? new Date(v.effectiveFrom).toISOString() : undefined),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: qk.prices })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(`Grade ${saved.grade} price set to ${formatRwf(saved.pricePerKg)}/kg.`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['grade', 'pricePerKg', 'effectiveFrom'])),
  })

  const onSubmit = handleSubmit((v) => {
    setServerError(null)
    if (v.effectiveFrom && new Date(v.effectiveFrom) < new Date(Date.now() - 60_000)) {
      setError('effectiveFrom', { message: 'Effective date cannot be in the past' })
      return
    }
    mutation.mutate(v)
  })

  return (
    <Modal
      open
      onClose={onClose}
      busy={mutation.isPending}
      title="Set price"
      description="A new price record is added. Past records and already-graded deliveries are not changed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>Save price</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <SelectField label="Grade" required error={errors.grade?.message} {...register('grade')}>
          {(grades ?? []).map((g) => <option key={g.code} value={g.code}>{g.name} ({g.code})</option>)}
        </SelectField>
        <TextField label={`New price per kg (${currencyCode()})`} type="number" step="0.01" inputMode="decimal" required autoFocus error={errors.pricePerKg?.message} {...register('pricePerKg', { valueAsNumber: true })} />
        <TextField label="Effective from" type="datetime-local" hint="Leave empty to apply immediately." error={errors.effectiveFrom?.message} {...register('effectiveFrom')} />
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
