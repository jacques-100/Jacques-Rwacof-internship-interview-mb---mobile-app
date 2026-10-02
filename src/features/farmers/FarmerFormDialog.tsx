import { useState } from 'react'
import { useGuardedMutation } from '@/lib/useGuardedMutation'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { farmerApi } from '@/api/farmerApi'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { applyServerError } from '@/lib/forms'
import type { Farmer } from '@/lib/types'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter the farmer\'s full name').max(120, 'Keep the name under 120 characters'),
  phone: z.string().trim().regex(/^(\+250|0)7\d{8}$/, 'Use a Rwandan mobile number, e.g. 0788123456'),
  cooperativeNumber: z.string().trim().regex(/^[A-Za-z0-9-]{3,30}$/, 'Use 3-30 letters, digits or dashes'),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function FarmerFormDialog({ farmer, open, onClose }: { farmer?: Farmer; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const editing = Boolean(farmer)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: farmer?.fullName ?? '',
      phone: farmer?.phone ?? '',
      cooperativeNumber: farmer?.cooperativeNumber ?? '',
      active: farmer?.active ?? true,
    },
  })

  const mutation = useGuardedMutation({
    mutationFn: (v: FormValues) => {
      const input = { fullName: v.fullName.trim(), phone: v.phone.trim(), cooperativeNumber: v.cooperativeNumber.trim().toUpperCase(), active: editing ? v.active : undefined }
      return farmer ? farmerApi.update(farmer.id, input) : farmerApi.create(input)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['farmers'] })
      await queryClient.invalidateQueries({ queryKey: ['audit'] })
      toast.success(editing ? `${saved.fullName} was updated.` : `${saved.fullName} registered (${saved.cooperativeNumber}).`)
      onClose()
    },
    onError: (e) => setServerError(applyServerError(e, setError, ['fullName', 'phone', 'cooperativeNumber'])),
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
      title={editing ? 'Edit farmer' : 'Register farmer'}
      description={editing ? undefined : 'Add a farmer so deliveries can be recorded against them.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            {editing ? 'Save changes' : 'Register farmer'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <TextField label="Full name" required autoFocus placeholder="e.g. Jean Paul Habimana" error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Phone number" type="tel" required placeholder="0788123456" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
        <TextField
          label="Cooperative membership number"
          required
          placeholder="e.g. NDB-1001"
          hint="Unique per farmer. Stored in capitals."
          error={errors.cooperativeNumber?.message}
          {...register('cooperativeNumber')}
        />
        {editing && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" {...register('active')} />
            <span>
              <span className="font-medium">Active</span>
              <span className="block text-stone-600">Inactive farmers keep their history but cannot receive new deliveries.</span>
            </span>
          </label>
        )}
        {/* Enter submits the form even though the primary button lives in the footer. */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
