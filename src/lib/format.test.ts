import { describe, expect, it } from 'vitest'
import { addDays, formatDate, formatKg, formatPercent, formatRwf, toIsoDate } from './format'

describe('format helpers', () => {
  it('formats weights and money with grouping and no float noise', () => {
    expect(formatKg(4650)).toBe('4,650 kg')
    expect(formatKg(120.5)).toBe('120.5 kg')
    expect(formatRwf(3_240_000)).toBe('RWF 3,240,000')
    expect(formatRwf(undefined)).toBe('-')
    expect(formatPercent(93)).toBe('93%')
    expect(formatPercent(71.1)).toBe('71.1%')
  })

  it('formats plain dates without shifting them across time zones', () => {
    expect(formatDate('2026-10-01')).toBe('01 Oct 2026')
    expect(formatDate(null)).toBe('-')
  })

  it('does date arithmetic across month and year boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
