import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useIsMobile } from '@/lib/hooks'
import { Button } from './ui/Button'
import { EmptyState, ErrorState, LoadingState } from './states'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Server-side sort property. Columns without it are not sortable. */
  sortKey?: string
  align?: 'left' | 'right'
  className?: string
  /** Minimum width so important columns never get squeezed to nothing. Tailwind class, e.g. "min-w-[10rem]". */
  minWidth?: string
}

export interface SortState {
  by: string
  dir: 'asc' | 'desc'
}

export interface PageState {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface DataTableProps<T> {
  /** Accessible table name (also announced for the mobile card list). */
  caption: string
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  pagination?: PageState
  onPageChange?: (page: number) => void
  onSizeChange?: (size: number) => void
  /** Heading shown on each mobile card. Defaults to the first column. */
  mobileTitle?: (row: T) => ReactNode
  /** Replaces the generic label/value card on phones with a purpose-built one. */
  mobileCard?: (row: T) => ReactNode
  /** Highlights a row, e.g. one that needs attention. */
  rowClassName?: (row: T) => string | undefined
}

/**
 * The one table used everywhere: sticky header, zebra rows, wrapping cells (nothing is ever cut off),
 * sortable columns, rows-per-page selector, and a card list on phones.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  emptyAction,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onSizeChange,
  mobileTitle,
  mobileCard,
  rowClassName,
}: DataTableProps<T>) {
  const mobile = useIsMobile()

  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (loading && !rows) return <LoadingState />
  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  }

  const toggleSort = (key: string) => {
    if (!onSortChange) return
    onSortChange({ by: key, dir: sort?.by === key && sort.dir === 'asc' ? 'desc' : 'asc' })
  }

  return (
    <div aria-busy={loading || undefined} className={cn(loading && 'opacity-70 transition-opacity')}>
      {mobile ? (
        <ul aria-label={caption} className="divide-y divide-stone-200">
          {rows.map((row) => (
            <li key={rowKey(row)} className={cn('space-y-2.5 px-4 py-3.5', rowClassName?.(row))}>
              {mobileCard ? mobileCard(row) : (<>
              <div className="text-[15px] font-semibold text-stone-900">{mobileTitle ? mobileTitle(row) : columns[0].cell(row)}</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {columns.slice(mobileTitle ? 0 : 1).map((c) => (
                  <div key={c.key} className={c.key === 'actions' ? 'col-span-2 pt-1' : ''}>
                    {c.key !== 'actions' && <dt className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">{c.header}</dt>}
                    <dd className="text-stone-800">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
              </>)}
            </li>
          ))}
        </ul>
      ) : (
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-left text-[14px]">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((c) => {
                  const active = sort?.by === c.sortKey
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={c.sortKey ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                      className={cn(
                        'sticky top-0 z-10 border-b border-stone-300 bg-stone-100 px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap text-stone-700 uppercase',
                        c.align === 'right' && 'text-right',
                        c.minWidth,
                      )}
                    >
                      {c.sortKey && onSortChange ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.sortKey!)}
                          className={cn('-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 uppercase hover:bg-stone-200', active && 'text-stone-950')}
                        >
                          {c.header}
                          {active ? (
                            sort!.dir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-stone-400" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className={cn('group even:bg-stone-50/70 hover:bg-brand-50/50', rowClassName?.(row))}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn('border-b border-stone-200/80 px-4 py-3 align-middle text-stone-900', c.align === 'right' && 'tabular text-right', c.minWidth, c.className)}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination && onPageChange && <Pagination {...pagination} onPageChange={onPageChange} onSizeChange={onSizeChange} />}
    </div>
  )
}

const PAGE_SIZES = [10, 20, 50, 100]

export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
}: PageState & { onPageChange: (page: number) => void; onSizeChange?: (size: number) => void }) {
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min(totalElements, (page + 1) * size)
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/60 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-4">
        <p className="tabular text-stone-700">
          Showing <strong>{from}-{to}</strong> of <strong>{totalElements}</strong>
        </p>
        {onSizeChange && (
          <label className="flex items-center gap-2 text-stone-700">
            Rows per page
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-stone-300 bg-white px-2 text-sm"
            >
              {(PAGE_SIZES.includes(size) ? PAGE_SIZES : [...PAGE_SIZES, size].sort((a, b) => a - b)).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 0} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </Button>
        <span className="tabular text-stone-700" aria-current="page">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages} aria-label="Next page">
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
