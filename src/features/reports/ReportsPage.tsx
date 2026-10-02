import { TOOLTIP_STYLE } from '@/components/chartStyle'
import { useState, type ReactElement, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { reportApi } from '@/api/reportApi'
import { qk } from '@/api/queryKeys'
import { DataTable, type Column } from '@/components/DataTable'
import { DatePicker } from '@/components/DatePicker'
import { PageHeader } from '@/components/PageHeader'
import { errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { addDays, formatDate, formatDateTime, formatNumber, formatPercent, stationToday } from '@/lib/format'
import { useSearchState } from '@/lib/useSearchState'
import type { Report, ReportColumn, ReportType } from '@/lib/types'

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'DAILY_INTAKE', label: 'Daily intake' },
  { value: 'WEEKLY_INTAKE', label: 'Weekly intake' },
  { value: 'MONTHLY_INTAKE', label: 'Monthly intake' },
  { value: 'FARMER_DELIVERY', label: 'Farmer deliveries' },
  { value: 'GRADE_DISTRIBUTION', label: 'Grade distribution' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'REJECTED_DELIVERIES', label: 'Rejected deliveries' },
  { value: 'CAPACITY_UTILIZATION', label: 'Capacity utilization' },
]

const GRADE_COLORS: Record<string, string> = { A: 'var(--color-brand-600)', B: 'var(--color-stone-400)' }

function formatCell(value: string | number | null | undefined, col: ReportColumn): string {
  if (value === null || value === undefined || value === '') return '-'
  switch (col.type) {
    case 'money':
    case 'number':
      return formatNumber(Number(value))
    case 'percent':
      return formatPercent(Number(value))
    case 'date':
      return formatDate(String(value))
    case 'datetime':
      return formatDateTime(String(value))
    default:
      return String(value)
  }
}

export function ReportsPage() {
  const toast = useToast()
  const today = stationToday()
  const defaults = { type: 'DAILY_INTAKE', from: addDays(today, -29), to: today }
  const s = useSearchState(defaults)
  const type = s.get('type') as ReportType
  const from = s.get('from')
  const to = s.get('to')
  const [exporting, setExporting] = useState(false)

  const rangeError = from && to && from > to ? 'The start date must not be after the end date.' : null
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.report(type, from, to),
    queryFn: () => reportApi.run(type, from, to),
    enabled: !rangeError,
  })

  const exportCsv = async () => {
    setExporting(true)
    try {
      await reportApi.exportCsv(type, from, to)
      toast.success('Report exported.')
    } catch (e) {
      toast.error(`Export failed: ${errorMessage(e)}`)
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<Record<string, string | number | null>>[] =
    data?.columns.map((c) => ({
      key: c.key,
      header: c.label,
      align: c.type === 'number' || c.type === 'money' || c.type === 'percent' ? ('right' as const) : ('left' as const),
      cell: (row) => formatCell(row[c.key], c),
    })) ?? []

  return (
    <>
      <PageHeader
        title="Reports"
        description="Management reports calculated from the authoritative records. Exports contain exactly what you see."
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()} loading={exporting} disabled={!data || Boolean(rangeError)}>
            <Download className="size-4" aria-hidden="true" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Report" value={type} onChange={(e) => s.set({ type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>
          <DatePicker label="From" value={from} max={to || undefined} onChange={(v) => s.set({ from: v })} />
          <DatePicker label="To" value={to} min={from || undefined} onChange={(v) => s.set({ to: v })} error={rangeError ?? undefined} />
          <div className="flex items-end">
            <Button variant="ghost" onClick={s.reset}>
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      {rangeError && <Alert tone="danger" className="mb-5">{rangeError}</Alert>}

      {!rangeError && (
        <>
          {data && <ReportChart report={data} />}
          <Card>
            <CardHeader
              title={TYPES.find((t) => t.value === type)?.label ?? 'Report'}
              description={data ? `${formatDate(data.from)} to ${formatDate(data.to)} · ${data.rows.length} row${data.rows.length === 1 ? '' : 's'}` : undefined}
            />
            <DataTable
              caption={TYPES.find((t) => t.value === type)?.label ?? 'Report'}
              columns={columns}
              rows={data?.rows}
              rowKey={(row) => JSON.stringify(row)}
              loading={isLoading || isFetching}
              error={error}
              onRetry={() => void refetch()}
              emptyTitle="No data for this period"
              emptyDescription="Try a wider date range."
              mobileTitle={(row) => formatCell(row[data!.columns[0].key], data!.columns[0])}
            />
            {data && data.rows.length > 0 && <Totals report={data} />}
          </Card>
        </>
      )}
    </>
  )
}

function Totals({ report }: { report: Report }) {
  const entries = report.columns.filter((c) => c.key in report.totals)
  if (entries.length === 0) return null
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-stone-200 bg-stone-50 px-4 py-3 text-sm">
      {entries.map((c) => (
        <div key={c.key}>
          <dt className="text-xs text-stone-500">Total {c.label.toLowerCase()}</dt>
          <dd className="tabular font-semibold text-stone-900">{formatNumber(report.totals[c.key])}</dd>
        </div>
      ))}
    </dl>
  )
}

function ReportChart({ report }: { report: Report }) {
  const rows = report.rows as Record<string, string | number>[]
  if (rows.length === 0) return null

  const label = (r: Record<string, string | number>, key: string) => (report.columns.find((c) => c.key === key)?.type === 'date' ? formatDate(String(r[key])).slice(0, 6) : String(r[key]))
  let chart: ReactNode = null
  let summary = ''

  switch (report.reportType) {
    case 'DAILY_INTAKE':
    case 'WEEKLY_INTAKE':
    case 'MONTHLY_INTAKE': {
      const data = rows.map((r) => ({ name: label(r, 'period'), Accepted: Number(r.accepted_kg), Rejected: Number(r.rejected_kg) }))
      summary = `Accepted and rejected kilograms per period, ${data.length} periods.`
      chart = (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stone-200)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${formatNumber(v)} kg`} />
          <Legend />
          <Bar dataKey="Accepted" fill="var(--color-brand-600)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Rejected" fill="var(--color-stone-400)" radius={[3, 3, 0, 0]} />
        </BarChart>
      )
      break
    }
    case 'CAPACITY_UTILIZATION': {
      const data = rows.map((r) => ({ name: label(r, 'date'), Utilization: Number(r.utilization_percent) }))
      summary = `Daily capacity utilization percentage, ${data.length} days.`
      chart = (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stone-200)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
          <Bar dataKey="Utilization" fill="var(--color-brand-600)" radius={[3, 3, 0, 0]} />
        </BarChart>
      )
      break
    }
    case 'FARMER_DELIVERY': {
      const data = rows.slice(0, 10).map((r) => ({ name: String(r.farmer), Accepted: Number(r.accepted_kg) }))
      summary = `Top ${data.length} farmers by accepted kilograms.`
      chart = (
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stone-200)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'var(--color-stone-600)' }} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${formatNumber(v)} kg`} />
          <Bar dataKey="Accepted" fill="var(--color-brand-600)" radius={[0, 3, 3, 0]} />
        </BarChart>
      )
      break
    }
    case 'GRADE_DISTRIBUTION': {
      const data = rows.map((r) => ({ name: `Grade ${r.grade}`, grade: String(r.grade), value: Number(r.weight_kg) }))
      summary = `Share of graded weight by grade: ${data.map((d) => `${d.name} ${formatNumber(d.value)} kg`).join(', ')}.`
      chart = (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
            {data.map((d) => <Cell key={d.grade} fill={GRADE_COLORS[d.grade] ?? 'var(--color-stone-500)'} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${formatNumber(v)} kg`} />
          <Legend />
        </PieChart>
      )
      break
    }
    default:
      return null
  }

  return (
    <Card className="mb-5">
      <CardBody>
        <div role="img" aria-label={summary} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chart as ReactElement}
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
