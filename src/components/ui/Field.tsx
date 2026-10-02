import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-md border bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-500'
const CONTROL_OK = 'border-stone-300 hover:border-stone-400'
const CONTROL_BAD = 'border-red-600'

interface FieldShellProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  /** Receives the generated ids so the control is wired to its label, hint and error. */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Label + control + hint + error, with correct label/aria associations. */
export function Field({ label, error, hint, required, className, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-700">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

interface BaseProps {
  label: string
  error?: string
  hint?: string
  fieldClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, error, hint, fieldClassName, className, required, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(CONTROL, 'h-9', invalid ? CONTROL_BAD : CONTROL_OK, className)}
          {...rest}
        />
      )}
    </Field>
  )
})

export const SelectField = forwardRef<HTMLSelectElement, BaseProps & SelectHTMLAttributes<HTMLSelectElement>>(function SelectField(
  { label, error, hint, fieldClassName, className, required, children, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(CONTROL, 'h-9', invalid ? CONTROL_BAD : CONTROL_OK, className)}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  )
})

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextAreaField(
  { label, error, hint, fieldClassName, className, required, ...rest },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={fieldClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={3}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(CONTROL, 'py-2', invalid ? CONTROL_BAD : CONTROL_OK, className)}
          {...rest}
        />
      )}
    </Field>
  )
})
