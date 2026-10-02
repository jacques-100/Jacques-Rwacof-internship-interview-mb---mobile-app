import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'
import { ThemeChoice, ThemeQuickToggle } from './ThemeControls'

/** A controllable stand-in for the device's colour-scheme setting. */
function stubSystem(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    get matches() {
      return dark
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', () => query)
  return (next: boolean) => {
    dark = next
    listeners.forEach((fn) => fn())
  }
}

const theme = () => document.documentElement.getAttribute('data-theme')

function Probe() {
  const { preference, resolved } = useTheme()
  return <p data-testid="state">{preference}/{resolved}</p>
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="#a11d3b">')
})
afterEach(() => {
  vi.unstubAllGlobals()
  document.querySelector('meta[name="theme-color"]')?.remove()
})

describe('theme', () => {
  it('follows the device by default and reacts when the device changes', () => {
    const setSystem = stubSystem(false)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('system/light')
    expect(theme()).toBe('light')
    act(() => setSystem(true))
    expect(screen.getByTestId('state')).toHaveTextContent('system/dark')
    expect(theme()).toBe('dark')
  })

  it('an explicit choice wins over the device and is remembered', async () => {
    stubSystem(true)
    const user = userEvent.setup()
    const { unmount } = render(<ThemeProvider><ThemeChoice /><Probe /></ThemeProvider>)
    expect(theme()).toBe('dark')   // device is dark

    await user.click(screen.getByRole('radio', { name: /^light/i }))
    expect(theme()).toBe('light')
    expect(localStorage.getItem('ct-theme')).toBe('light')
    expect(screen.getByRole('radio', { name: /^light/i })).toBeChecked()

    unmount()
    render(<ThemeProvider><Probe /></ThemeProvider>)   // a later visit
    expect(screen.getByTestId('state')).toHaveTextContent('light/light')
    expect(theme()).toBe('light')
  })

  it('the quick toggle flips between light and dark and updates the browser chrome colour', async () => {
    stubSystem(false)
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeQuickToggle /></ThemeProvider>)
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(theme()).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#14100d')
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(theme()).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#a11d3b')
  })

  it('ignores unusable saved values and works when storage is blocked', async () => {
    stubSystem(false)
    localStorage.setItem('ct-theme', 'purple')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('state')).toHaveTextContent('system/light')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeQuickToggle /></ThemeProvider>)
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(theme()).toBe('dark')   // still applies for this visit
  })
})
