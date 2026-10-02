/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Spring Boot API, e.g. http://192.168.1.20:8080. Empty on the web, where /api is proxied. */
  readonly VITE_API_BASE_URL?: string
}
