import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { errorMessage } from '@/components/states'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ACCEPT, imageProblem } from '@/lib/imageUpload'

interface ImageUploaderProps {
  /** Shows what is there now; null when nothing has been uploaded. */
  preview: ReactNode
  hasImage: boolean
  maxBytes: number
  /** Called with the chosen file once it passes the basic checks. May transform it first. */
  onUpload: (file: File) => Promise<unknown>
  onRemove: () => Promise<unknown>
  /** Optional step between choosing and uploading, e.g. cropping a photo to a thumbnail. */
  prepare?: (file: File) => Promise<File>
  chooseLabel: string
  removeLabel: string
  hint: string
  disabled?: boolean
}

/**
 * Choose, upload, replace and remove one image. The file is checked here for a quick, friendly message
 * (type and size) and again by the server, which is the one that actually decides.
 */
export function ImageUploader({ preview, hasImage, maxBytes, onUpload, onRemove, prepare, chooseLabel, removeLabel, hint, disabled }: ImageUploaderProps) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = async (kind: 'upload' | 'remove', task: () => Promise<unknown>) => {
    if (busy) return   // a second tap while one request is running does nothing
    setBusy(kind)
    setError(null)
    try {
      await task()
    } catch (e) {
      if (mounted.current) setError(errorMessage(e))
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  const onChoose = (file: File | undefined) => {
    if (input.current) input.current.value = ''   // choosing the same file again must still fire
    if (!file) return
    const problem = imageProblem(file, maxBytes)
    if (problem) {
      setError(problem)
      return
    }
    void run('upload', async () => onUpload(prepare ? await prepare(file) : file))
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className={cn('shrink-0', busy && 'opacity-60')}>{preview}</div>
      <div className="min-w-0 space-y-2">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <input id={inputId} ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => onChoose(e.target.files?.[0])} />
          <Button type="button" variant="secondary" disabled={disabled || busy !== null} loading={busy === 'upload'} onClick={() => input.current?.click()}>
            <ImagePlus className="size-4" aria-hidden="true" /> {chooseLabel}
          </Button>
          {hasImage && (
            <Button type="button" variant="ghost" disabled={disabled || busy !== null} loading={busy === 'remove'} onClick={() => void run('remove', onRemove)}>
              <Trash2 className="size-4" aria-hidden="true" /> {removeLabel}
            </Button>
          )}
        </div>
        <p className="text-xs text-stone-600">{hint}</p>
      </div>
    </div>
  )
}
