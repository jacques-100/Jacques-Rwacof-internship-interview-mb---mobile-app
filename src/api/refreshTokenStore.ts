import { SecureStorage } from '@aparajita/capacitor-secure-storage'

const KEY = 'ct_refresh_token'

/**
 * The native app has no httpOnly cookie, so its refresh token lives in the Android Keystore-backed
 * secure storage (never in localStorage). Browsers do not use this at all.
 */
export const refreshTokenStore = {
  async get(): Promise<string | null> {
    try {
      const value = await SecureStorage.get(KEY)
      return typeof value === 'string' && value ? value : null
    } catch {
      return null
    }
  },
  async set(token: string): Promise<void> {
    try {
      await SecureStorage.set(KEY, token)
    } catch {
      // Without storage the user just has to sign in again next launch.
    }
  },
  async clear(): Promise<void> {
    try {
      await SecureStorage.remove(KEY)
    } catch {
      // nothing to clear
    }
  },
}
