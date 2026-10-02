import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface State {
  failed: boolean
}

/** Last line of defence: an unexpected render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl">Something went wrong</h1>
        <p className="text-sm text-stone-600">The page hit an unexpected problem. Your data is safe. Reload to continue.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
