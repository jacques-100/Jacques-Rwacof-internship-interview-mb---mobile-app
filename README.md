# CherryTrack Mobile App (Android)

The clerk's phone app. It is the **React + TypeScript application wrapped by [Capacitor](https://capacitorjs.com)**, the native Android runtime/bridge, calling the same Spring Boot + MySQL backend (`backend/`). There is no second backend.

> The original brief names React Native. Capacitor was chosen deliberately because the existing, tested React code, API client, validation and workflows could be reused instead of rewritten, and the deadline was close. This is a Capacitor app, not React Native.

```text
MySQL <- Spring Boot REST API <- React UI (phone layout) <- Capacitor <- Android app
```

## What a clerk can do

Sign in, see today's intake against the daily capacity (accepted, remaining, counts by status), browse deliveries by date and status, record a delivery (searchable farmer picker, date, weight), open a delivery, correct its weight while `RECEIVED`, grade it, reject it (with confirmation), and mark it paid (with confirmation). Buttons appear only for actions the server currently allows.

Light and dark mode: the sun/moon button in the header, or "Dark mode" in the More menu on phones; Settings has Light, Dark and System. Profile: a user can add or change their photo from **My profile** (the phone's file picker opens; the photo is cropped and shrunk before upload). The company logo, set by an administrator, appears in the menu and on the sign-in screen.

Phone-specific: bottom navigation (Dashboard, Deliveries, Record, Farmers, More), compact delivery cards, 44 px touch targets, an offline banner, a 20 s request timeout with retry, duplicate-tap protection, and Android back-button handling.

**Everything authoritative stays on the server:** amount owed, price, capacity, status transitions and authorization. The app never sends an amount or price; validation in the form is only a convenience, the backend decides.

## Build and run (Windows, Android Studio)

Requirements: Node 22+, JDK 21 (Android Studio's bundled JBR 21 works), Android Studio with an Android SDK (API 36), and an emulator or a phone with USB debugging.

1. **Backend reachable from the phone.** Run `backend/` (port 8080). Spring listens on all interfaces, but Windows Firewall must allow it (once, as administrator):

   ```bat
   netsh advfirewall firewall add rule name="CherryTrack API" dir=in action=allow protocol=TCP localport=8080
   ```

2. **Tell the app where the API is.** `localhost` on a phone is the phone itself. Use your computer's LAN IP (`ipconfig`, IPv4 Address) for a real phone on the same Wi-Fi, or `10.0.2.2` for the Android emulator.

   ```bash
   cp .env.mobile.example .env.mobile          # edit VITE_API_BASE_URL
   npm ci
   ```

   PowerShell:

   ```powershell
   $env:CAP_CLEARTEXT = 'true'
   npm run build:mobile      # builds the web assets and syncs them into android/
   npm run android:open      # opens Android Studio
   ```

   Bash: `CAP_CLEARTEXT=true npm run build:mobile`.

3. In Android Studio let Gradle sync finish, choose a device and press **Run**. After code changes run `npm run build:mobile` again and press Run.

`CAP_CLEARTEXT=true` is only for a plain-HTTP development backend: the WebView is served over http (otherwise the browser engine blocks http API calls as mixed content) and the **debug** build allows cleartext traffic (`android/app/src/debug/AndroidManifest.xml`). **Release builds are HTTPS-only**: leave `CAP_CLEARTEXT` unset and point `VITE_API_BASE_URL` at an https URL.

APK: Android Studio, *Build > Build Bundle(s) / APK(s) > Build APK(s)*. For distribution use *Generate Signed App Bundle / APK*; never commit the signing key or its passwords.

## Sign-in on the phone

Browsers keep the refresh token in an httpOnly cookie; an app has no such cookie jar. The app sends `X-Client: native`, the backend returns the refresh token in the response body, and the app keeps it in Android Keystore-backed secure storage (`@aparajita/capacitor-secure-storage`), never in plain storage. It is rotated on every refresh and revoked on sign-out. The 30-minute access token lives in memory only. Losing the signal does not sign anyone out; an expired or revoked session does. This needs the backend in this submission (it adds the `X-Client` / `X-Refresh-Token` handling and the CORS headers).

## Tests

```bash
npm run lint && npm run typecheck && npm test        # includes the native sign-in flow with secure storage mocked
E2E_PASSWORD=... npm run e2e                          # Pixel 7 browser viewport against the running stack
```

The end-to-end tests exercise the phone UI in a browser; they do not run on a physical device.

## Troubleshooting

- *"Cannot reach the server"*: wrong IP in `.env.mobile`, a different network, or the firewall rule is missing. Open `http://<ip>:8080/api/v1/auth/refresh` in the phone's browser; a 401 reply means the API is reachable.
- *Blank white screen*: rebuild with `npm run build:mobile`; inspect the WebView from desktop Chrome at `chrome://inspect`.
- *Gradle sync fails*: use JDK 21 (*Settings > Build Tools > Gradle > Gradle JDK*).
- *Login fails with a CORS error*: add the app origin to the backend's `CORS_ALLOWED_ORIGINS` (`http://localhost` for cleartext builds, `https://localhost` otherwise).

## Structure

```text
android/          the generated Android project (Gradle); web assets are copied into it by `cap sync`
capacitor.config.ts   app id com.cherrytrack.app, name CherryTrack
src/              the React app (shared with the web project)
  components/layout/BottomNav.tsx, OfflineBanner.tsx   phone navigation
  features/farmers/FarmerPicker.tsx                    searchable farmer selection
  features/deliveries/DeliveryCard.tsx                 compact delivery card
  api/client.ts, api/refreshTokenStore.ts              API client, timeout, secure token storage
```
