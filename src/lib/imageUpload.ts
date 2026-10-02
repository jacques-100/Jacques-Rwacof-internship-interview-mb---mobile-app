export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const ACCEPT = IMAGE_TYPES.join(',')

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
/** What the server accepts for a photo; a bigger one is shrunk in the browser first. */
export const AVATAR_MAX_BYTES = 1024 * 1024
/** The largest original a person may pick: it is cropped and compressed before upload. */
export const AVATAR_SOURCE_MAX_BYTES = 12 * 1024 * 1024

/** A friendly message when the chosen file can't be used, or null when it can. The server checks again. */
export function imageProblem(file: File, maxBytes: number): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a PNG, JPEG or WebP image.'
  if (file.size > maxBytes) return `That image is larger than ${Math.round(maxBytes / (1024 * 1024))} MB. Choose a smaller one.`
  return null
}

/**
 * Centre-crops to a square and shrinks to `size` pixels, so a 12 MB phone photo becomes a few kilobytes.
 * Falls back to the original file if the browser cannot decode or draw it.
 */
export async function squareThumbnail(file: File, size = 256): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}
