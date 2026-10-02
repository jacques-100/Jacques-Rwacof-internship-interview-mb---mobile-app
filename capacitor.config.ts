import type { CapacitorConfig } from '@capacitor/cli'

// Read by the Capacitor CLI under Node; the app's tsconfig has no Node types.
declare const process: { env: Record<string, string | undefined> }

/**
 * Development against a plain-HTTP backend on the LAN needs the WebView itself to be served over http
 * (otherwise the browser engine blocks http API calls from an https page as mixed content):
 *   CAP_CLEARTEXT=true npx cap sync android
 * Production builds leave this unset and talk to an https API.
 */
const cleartext = process.env.CAP_CLEARTEXT === 'true'

const config: CapacitorConfig = {
  appId: 'com.cherrytrack.app',
  appName: 'CherryTrack',
  webDir: 'dist',
  server: { androidScheme: cleartext ? 'http' : 'https' },
  android: { allowMixedContent: false },
}

export default config
