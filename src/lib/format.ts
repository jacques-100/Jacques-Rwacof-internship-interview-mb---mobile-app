const TIME_ZONE = 'Africa/Kigali'

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const weightFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const percentFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '-' : numberFmt.format(value)
}

export function formatKg(value: number | null | undefined): string {
  return value == null ? '-' : `${weightFmt.format(value)} kg`
}

/** The currency code comes from the system settings (Settings page); it is never hardcoded in screens. */
let currency = 'RWF'

export function setCurrencyCode(code: string): void {
  currency = code
}

export function currencyCode(): string {
  return currency
}

export function formatMoney(value: number | null | undefined): string {
  return value == null ? '-' : `${currency} ${numberFmt.format(value)}`
}

/** Kept as an alias so existing call sites read naturally; the code shown is the configured currency. */
export const formatRwf = formatMoney

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '-' : `${percentFmt.format(value)}%`
}

/** yyyy-MM-dd (or ISO instant) -> "01 Oct 2026". Plain dates are not shifted by time zone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? {} : { timeZone: TIME_ZONE }),
  }).format(date)
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** Local calendar date as yyyy-MM-dd (no UTC shift). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** Today's date in the station's time zone, as yyyy-MM-dd. */
export function stationToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return parts
}

/** Weight text -> number, or NaN when blank/invalid. */
export function parseWeight(text: string): number {
  return text.trim() === '' ? NaN : Number(text)
}
