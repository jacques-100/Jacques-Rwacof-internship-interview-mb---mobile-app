import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { AuthProvider } from './auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import { ThemeProvider } from './theme/ThemeContext'
import { StationProvider } from './station/StationContext'
import { SystemSettingsProvider } from './settings/SystemSettingsContext'
import { createQueryClient } from './lib/queryClient'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './index.css'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <SystemSettingsProvider>
                <StationProvider>
                  <App />
                </StationProvider>
              </SystemSettingsProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
