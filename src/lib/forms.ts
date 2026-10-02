import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/client'

/**
 * Maps a backend validation error onto form fields. Returns a message for anything that isn't
 * tied to a field (business-rule errors, network errors) so the form can show it as a banner.
 */
export function applyServerError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]): string | null {
  if (error instanceof ApiError) {
    let mapped = 0
    for (const fe of error.fieldErrors) {
      if (fields.includes(fe.field)) {
        setError(fe.field as Path<T>, { type: 'server', message: fe.message })
        mapped++
      }
    }
    if (mapped > 0 && mapped === error.fieldErrors.length) return null
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}
