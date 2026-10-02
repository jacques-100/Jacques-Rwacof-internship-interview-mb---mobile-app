import { Capacitor } from '@capacitor/core'

/** True inside the Capacitor Android app, false in any browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}
