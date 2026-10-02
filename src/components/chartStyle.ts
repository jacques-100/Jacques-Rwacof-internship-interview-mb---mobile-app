import type { CSSProperties } from 'react'

/** Recharts draws its tooltip with inline styles, so it takes the theme's surface and text colours here. */
export const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--color-stone-300)',
  borderRadius: 7,
  color: 'var(--color-stone-900)',
}
