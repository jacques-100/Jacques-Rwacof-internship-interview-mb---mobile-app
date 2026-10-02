import { TextField } from './ui/Field'

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  error?: string
  hint?: string
  required?: boolean
  fieldClassName?: string
}

/** Native date input: keyboard friendly, localised and accessible without extra dependencies. */
export function DatePicker({ label, value, onChange, min, max, error, hint, required, fieldClassName }: DatePickerProps) {
  return (
    <TextField
      type="date"
      label={label}
      value={value}
      min={min}
      max={max}
      error={error}
      hint={hint}
      required={required}
      fieldClassName={fieldClassName}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
