import { useCallback, useRef } from 'react'
import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'

/**
 * useMutation that ignores `mutate` while a previous call is still running.
 *
 * Disabling the submit button isn't enough on its own: the button only disables after React
 * re-renders, and form validation is asynchronous, so a fast double-click can start two submissions.
 * The ref is set synchronously, closing that window, so one click always means one request.
 */
export function useGuardedMutation<TData = unknown, TError = Error, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> {
  const inFlight = useRef(false)

  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    onSettled: (...args) => {
      inFlight.current = false
      return options.onSettled?.(...args)
    },
  })

  const { mutate: rawMutate } = mutation
  const mutate = useCallback(
    (...args: Parameters<typeof rawMutate>) => {
      if (inFlight.current) return
      inFlight.current = true
      rawMutate(...args)
    },
    [rawMutate],
  )

  return { ...mutation, mutate } as UseMutationResult<TData, TError, TVariables>
}
