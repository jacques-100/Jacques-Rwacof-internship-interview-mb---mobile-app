import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { makeCapacity, makeDashboard, page } from './test/fixtures'
import { anonymous, asRole, mockApi, renderWithProviders, sessionFor } from './test/utils'

describe('authentication and route protection', () => {
  it('redirects anonymous visitors to the sign-in page', async () => {
    mockApi({ ...anonymous })
    renderWithProviders(<App />, { route: '/deliveries' })
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('validates the login form before calling the server', async () => {
    const api = mockApi({ ...anonymous })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your username')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/auth/login')).toHaveLength(0)
  })

  it('shows the server message when credentials are wrong', async () => {
    mockApi({
      ...anonymous,
      'POST /api/v1/auth/login': () => ({ status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' } }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(await screen.findByLabelText(/username/i), 'clerk')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument()
  })

  it('signs in and lands on the dashboard', async () => {
    const api = mockApi({
      ...anonymous,
      'POST /api/v1/auth/login': () => sessionFor('SUPERVISOR'),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(await screen.findByLabelText(/username/i), 'Supervisor')
    await user.type(screen.getByLabelText(/password/i), 'Test-Passw0rd!26')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/auth/login')[0].body).toEqual({ username: 'supervisor', password: 'Test-Passw0rd!26' })
  })
})

describe('sidebar follows the role', () => {
  async function sidebarFor(role: 'CLERK' | 'SUPERVISOR' | 'ADMIN') {
    mockApi({ ...asRole(role) })
    renderWithProviders(<App />, { route: '/' })
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' })
    return within(nav).queryAllByRole('link').map((l) => l.textContent)
  }

  it('gives a clerk the daily-operations pages only', async () => {
    const links = await sidebarFor('CLERK')
    // ordered the way work happens: know the farmer, open the day, receive, grade
    expect(links).toEqual(['Dashboard', 'Farmers', 'Daily Intake', 'Deliveries', 'Grading', 'Prices & Grades', 'Settings'])
  })

  it('adds payments, reports and audit logs for a supervisor', async () => {
    const links = await sidebarFor('SUPERVISOR')
    expect(links).toEqual(['Dashboard', 'Farmers', 'Daily Intake', 'Deliveries', 'Grading', 'Payments', 'Prices & Grades', 'Reports', 'Audit Logs', 'Settings'])
  })

  it('shows everything, including users, to an administrator', async () => {
    expect(await sidebarFor('ADMIN')).toEqual([
      'Dashboard', 'Farmers', 'Daily Intake', 'Deliveries', 'Grading', 'Payments', 'Prices & Grades', 'Reports', 'Audit Logs', 'Stations', 'Users & Staff', 'Settings',
    ])
  })

  it('shows a clear no-access screen when a clerk opens an admin URL directly', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<App />, { route: '/users' })
    expect(await screen.findByRole('heading', { name: /don't have access/i })).toBeInTheDocument()
  })

  it('shows the user, role and a logout button in the header', async () => {
    mockApi({ ...asRole('SUPERVISOR'), 'POST /api/v1/auth/logout': () => ({ status: 204 }) })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/' })
    expect(await screen.findByText('SUPERVISOR Tester')).toBeInTheDocument()
    expect(screen.getAllByText('Supervisor').length).toBeGreaterThan(0)   // their job role, shown in the header
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('dashboard', () => {
  it('shows capacity, KPI figures and recent deliveries from the backend', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<App />, { route: '/' })

    expect(await screen.findByText(/4,650 kg/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /daily intake capacity used/i })).toHaveAttribute('aria-valuenow', '4650')
    expect(screen.getByText('RWF 3,240,000')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DLV-NDB-20261001-00042' })).toBeInTheDocument()
    expect(screen.getByText('Daily intake capacity is nearly reached.')).toBeInTheDocument()
  })

  it('shows the full-capacity alert', async () => {
    mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/dashboard': () => makeDashboard({ capacity: makeCapacity({ acceptedKg: 5000, remainingKg: 0, utilizationPercent: 100, alert: 'FULL' }) }),
    })
    renderWithProviders(<App />, { route: '/' })
    expect(await screen.findByText('Daily intake capacity reached.')).toBeInTheDocument()
  })

  it('shows no alert when there is plenty of capacity', async () => {
    mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/dashboard': () => makeDashboard({ capacity: makeCapacity({ acceptedKg: 1000, remainingKg: 4000, utilizationPercent: 20, alert: 'NONE' }) }),
    })
    renderWithProviders(<App />, { route: '/' })
    await screen.findByText(/1,000 kg/)
    expect(screen.queryByText(/nearly reached/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Daily intake capacity reached.')).not.toBeInTheDocument()
  })

  it('recovers from an API failure with a retry button instead of a blank page', async () => {
    let fail = true
    mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/dashboard': () => (fail ? { status: 500, body: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } } : makeDashboard()),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this data')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByText(/4,650 kg/)).toBeInTheDocument())
  })

  it('shows an empty state when there are no deliveries', async () => {
    mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/dashboard': () => makeDashboard({ recentDeliveries: [] }),
      'GET /api/v1/deliveries': () => page([]),
    })
    renderWithProviders(<App />, { route: '/' })
    expect(await screen.findByText('No deliveries yet')).toBeInTheDocument()
  })
})
