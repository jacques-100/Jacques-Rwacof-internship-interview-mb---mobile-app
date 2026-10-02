import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'
import { getStationId } from '@/api/client'
import { GRADES, SYSTEM_SETTINGS, makeCapacity, makeDelivery, makeFarmer, makeGrade, makeStation, makeUser, page } from '@/test/fixtures'
import { asRole, mockApi, renderWithProviders } from '@/test/utils'

const PRICES = {
  current: [{ id: 1, grade: 'A', pricePerKg: 1200, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true }],
  history: [{ id: 1, grade: 'A', pricePerKg: 1200, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true }],
}

describe('stations and the station switcher', () => {
  it('sends the selected station on every request and re-fetches when it changes', async () => {
    const stations = [makeStation(), makeStation({ id: 2, code: 'GKM', name: 'Gikomero Washing Station' })]
    const seen: (number | null)[] = []
    const api = mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/stations': () => stations,
      'GET /api/v1/dashboard': () => {
        seen.push(getStationId())
        return { capacity: makeCapacity(), intakeTrend: [], statusDistribution: [], recentDeliveries: [] }
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/' })

    await screen.findByRole('heading', { name: 'Dashboard' })
    await waitFor(() => expect(seen).toContain(1))

    await user.selectOptions(screen.getByLabelText('Station'), '2')
    await waitFor(() => expect(seen).toContain(2))
    expect(api.find('GET', '/api/v1/dashboard').length).toBeGreaterThan(1)
  })

  it('does not offer a switcher to someone with a single station', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<App />, { route: '/' })
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.queryByLabelText('Station')).not.toBeInTheDocument()
  })

  it('tells a user with no station to ask an administrator', async () => {
    mockApi({ ...asRole('CLERK'), 'GET /api/v1/stations': () => [] })
    renderWithProviders(<App />, { route: '/' })
    expect(await screen.findByRole('heading', { name: 'You are not assigned to a station' })).toBeInTheDocument()
  })

  it('invites an administrator with no stations to register the first one', async () => {
    mockApi({ ...asRole('ADMIN'), 'GET /api/v1/stations': () => [] })
    renderWithProviders(<App />, { route: '/' })
    expect(await screen.findByRole('heading', { name: 'Register your first station' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Stations' })).toHaveAttribute('href', '/stations')
  })

  it('lets an administrator register a station with validation', async () => {
    const api = mockApi({
      ...asRole('ADMIN'),
      'POST /api/v1/stations': () => ({ status: 201, body: makeStation({ id: 9, code: 'GKM', name: 'Gikomero Station' }) }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/stations' })

    await user.click(await screen.findByRole('button', { name: /register station/i }))
    const dialog = await screen.findByRole('dialog')
    await user.clear(within(dialog).getByLabelText(/largest delivery/i))
    await user.type(within(dialog).getByLabelText(/largest delivery/i), '9000')
    await user.click(within(dialog).getByRole('button', { name: 'Register station' }))
    expect(await within(dialog).findByText(/2-10 letters or digits/i)).toBeInTheDocument()
    expect(within(dialog).getByText('Cannot exceed the daily capacity')).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/stations')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText(/^code/i), 'gkm')
    await user.type(within(dialog).getByLabelText(/^station name/i), 'Gikomero Station')
    await user.clear(within(dialog).getByLabelText(/largest delivery/i))
    await user.type(within(dialog).getByLabelText(/largest delivery/i), '450')
    await user.click(within(dialog).getByRole('button', { name: 'Register station' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/stations')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/stations')[0].body).toMatchObject({ code: 'GKM', name: 'Gikomero Station', maxDeliveryKg: 450, dailyCapacityKg: 5000 })
  })

  it('filters the station list', async () => {
    mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/stations': () => [makeStation(), makeStation({ id: 2, code: 'OLD', name: 'Old Station', active: false })],
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/stations' })
    const table = await screen.findByRole('table', { name: 'Stations' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    await user.selectOptions(screen.getByLabelText('Status'), 'false')
    expect(within(await screen.findByRole('table', { name: 'Stations' })).getAllByRole('row')).toHaveLength(2)
    expect(within(await screen.findByRole('table', { name: 'Stations' })).getByText('Old Station')).toBeInTheDocument()
  })

  it('keeps stations away from clerks', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<App />, { route: '/stations' })
    expect(await screen.findByRole('heading', { name: /don't have access/i })).toBeInTheDocument()
  })
})

describe('my profile', () => {
  it('shows my role and stations read-only and saves my contact details', async () => {
    const api = mockApi({
      ...asRole('SUPERVISOR'),
      'PUT /api/v1/auth/me': ({ body }) => makeUser('SUPERVISOR', { ...(body as object), fullName: 'Alice M.' } as never),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/profile' })

    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByText('Supervisor access')).toBeInTheDocument()
    expect(screen.getAllByText('Nduba Coffee Washing Station').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()   // nothing to save yet

    const name = screen.getByLabelText(/full name/i)
    await user.clear(name)
    await user.type(name, 'Alice M.')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Phone'), '12')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/rwandan mobile number/i)).toBeInTheDocument()
    expect(api.find('PUT', '/api/v1/auth/me')).toHaveLength(0)

    await user.clear(screen.getByLabelText('Phone'))
    await user.type(screen.getByLabelText('Phone'), '0788123456')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.find('PUT', '/api/v1/auth/me')).toHaveLength(1))
    expect(api.find('PUT', '/api/v1/auth/me')[0].body).toEqual({ fullName: 'Alice M.', email: 'alice@example.com', phone: '0788123456' })
    expect(await screen.findByText('Your profile was saved.')).toBeInTheDocument()
  })

  it('validates a password change before sending it', async () => {
    const api = mockApi({ ...asRole('CLERK') })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/profile' })

    await user.type(await screen.findByLabelText(/^current password/i), 'old-password-123')
    await user.type(screen.getByLabelText(/^new password/i), 'short')
    await user.type(screen.getByLabelText(/^repeat new password/i), 'different')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Use at least 10 characters')).toBeInTheDocument()
    expect(screen.getByText('The two passwords do not match')).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/auth/me/password')).toHaveLength(0)
  })

  it('changes the password and keeps me signed in', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      'POST /api/v1/auth/me/password': () => ({ accessToken: 'fresh-token', expiresInSeconds: 1800, user: makeUser('CLERK') }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/profile' })

    await user.type(await screen.findByLabelText(/^current password/i), 'old-password-123')
    await user.type(screen.getByLabelText(/^new password/i), 'Brand-new-passw0rd')
    await user.type(screen.getByLabelText(/^repeat new password/i), 'Brand-new-passw0rd')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/auth/me/password')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/auth/me/password')[0].body).toEqual({ currentPassword: 'old-password-123', newPassword: 'Brand-new-passw0rd' })
    expect(await screen.findByText(/signed out of your other devices/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My profile' })).toBeInTheDocument()   // still signed in
  })

  it('shows the server message for a wrong current password without signing out', async () => {
    mockApi({
      ...asRole('CLERK'),
      'POST /api/v1/auth/me/password': () => ({ status: 422, body: { code: 'WRONG_PASSWORD', message: 'Your current password is incorrect.' } }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/profile' })
    await user.type(await screen.findByLabelText(/^current password/i), 'wrong-password-1')
    await user.type(screen.getByLabelText(/^new password/i), 'Brand-new-passw0rd')
    await user.type(screen.getByLabelText(/^repeat new password/i), 'Brand-new-passw0rd')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My profile' })).toBeInTheDocument()
  })
})

describe('users and staff (tabs)', () => {
  const roles = [
    { id: 1, name: 'Administrator', accessLevel: 'ADMIN', systemRole: true, active: true, users: 1, permissions: [], createdAt: '2026-01-01T00:00:00Z' },
    { id: 3, name: 'Clerk', accessLevel: 'CLERK', systemRole: true, active: true, users: 4, permissions: [], createdAt: '2026-01-01T00:00:00Z' },
    { id: 4, name: 'Quality Inspector', description: 'Grades cherries', accessLevel: 'CLERK', systemRole: false, active: true, users: 1, permissions: [], createdAt: '2026-01-01T00:00:00Z' },
  ]
  const handlers = () => ({
    ...asRole('ADMIN'),
    'GET /api/v1/users': ({ query }: { query: URLSearchParams }) => page([makeUser('CLERK', { id: 5, fullName: 'Patrick', username: 'patrick', jobRole: { id: 4, name: query.get('q') ?? 'Quality Inspector' } })]),
    'GET /api/v1/roles': () => roles,
    'GET /api/v1/permissions': () => [{ code: 'DELIVERY_CREATE', group: 'Deliveries', label: 'Record deliveries', description: 'Receive a delivery.' }],
    'GET /api/v1/departments': () => [{ id: 1, code: 'INT', name: 'Intake', headName: 'Alice', active: true, currentStaff: 3 }],
    'GET /api/v1/employments': () => page([]),
  })

  it('has Users, Roles, Departments and Employments tabs with the right keyboard behaviour', async () => {
    mockApi(handlers())
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users' })

    const tablist = await screen.findByRole('tablist', { name: 'Staff directory' })
    const tabs = within(tablist).getAllByRole('tab').map((t) => t.textContent)
    expect(tabs).toEqual(['Users', 'Roles', 'Permissions', 'Departments', 'Employments'])
    expect(within(tablist).getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(tablist).getByRole('tab', { name: 'Roles' }))
    expect(await screen.findByRole('table', { name: 'Roles' })).toBeInTheDocument()
    expect(screen.getByText('Quality Inspector')).toBeInTheDocument()

    within(tablist).getByRole('tab', { name: 'Roles' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('table', { name: 'Permissions held by each role' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('table', { name: 'Departments' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByText('No employment records yet')).toBeInTheDocument()
  })

  it('filters roles by access level and search', async () => {
    mockApi(handlers())
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users?tab=roles' })
    const table = await screen.findByRole('table', { name: 'Roles' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)

    await user.selectOptions(screen.getByLabelText('Access level'), 'ADMIN')
    expect(within(await screen.findByRole('table', { name: 'Roles' })).getAllByRole('row')).toHaveLength(2)
    await user.selectOptions(screen.getByLabelText('Access level'), '')
    await user.type(screen.getByLabelText('Search'), 'inspector')
    expect(within(await screen.findByRole('table', { name: 'Roles' })).getAllByRole('row')).toHaveLength(2)
  })

  it('creates a custom role and protects built-in ones', async () => {
    const api = mockApi({ ...handlers(), 'POST /api/v1/roles': () => ({ status: 201, body: { ...roles[2], id: 9, name: 'Deputy' } }) })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users?tab=roles' })

    await user.click(await screen.findByRole('button', { name: /new role/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^role name/i), 'Deputy')
    await user.selectOptions(within(dialog).getByLabelText(/^access level/i), 'SUPERVISOR')
    expect(within(dialog).getByText(/payments, prices, reports/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/roles')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/roles')[0].body).toMatchObject({ name: 'Deputy', accessLevel: 'SUPERVISOR' })

    await user.click(await screen.findByRole('button', { name: 'Edit Clerk' }))
    const editing = await screen.findByRole('dialog')
    expect(within(editing).getByLabelText(/^role name/i)).toBeDisabled()
    expect(within(editing).getByLabelText(/^access level/i)).toBeDisabled()
  })

  it('sends user filters to the server', async () => {
    const api = mockApi(handlers())
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users' })
    await screen.findByRole('table', { name: 'Users' })

    await user.selectOptions(screen.getByLabelText('Status'), 'true')
    await user.selectOptions(screen.getByLabelText('Access level'), 'CLERK')
    await waitFor(() => {
      const last = api.calls.filter((c) => c.path === '/api/v1/users').length
      expect(last).toBeGreaterThan(1)
    })
    expect(screen.getByText('Patrick')).toBeInTheDocument()
  })
})

describe('prices and grades', () => {
  const handlers = () => ({ ...asRole('SUPERVISOR'), 'GET /api/v1/prices': () => PRICES })

  it('shows each configured grade with its current price and flags one without a price', async () => {
    mockApi({ ...handlers(), 'GET /api/v1/grades': () => [...GRADES, makeGrade({ id: 3, code: 'AA', name: 'Grade AA', sortOrder: 0 })] })
    renderWithProviders(<App />, { route: '/prices' })
    expect((await screen.findAllByText('RWF 1,200')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/No price yet/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Grade AA')).toBeInTheDocument()
  })

  it('lets a supervisor add a grade, then set its price from the configured grades', async () => {
    const api = mockApi({
      ...handlers(),
      'POST /api/v1/grades': () => ({ status: 201, body: makeGrade({ id: 7, code: 'AA', name: 'Grade AA' }) }),
      'POST /api/v1/prices': () => ({ status: 201, body: { id: 5, grade: 'A', pricePerKg: 1300, effectiveFrom: '2026-10-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z', current: true } }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/prices?tab=grades' })

    await user.click(await screen.findByRole('button', { name: /add grade/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^code/i), 'aa')
    await user.type(within(dialog).getByLabelText(/^name/i), 'Grade AA')
    await user.click(within(dialog).getByRole('button', { name: 'Add grade' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/grades')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/grades')[0].body).toMatchObject({ code: 'AA', name: 'Grade AA' })
  })

  it('hides price and grade controls from a clerk', async () => {
    mockApi({ ...asRole('CLERK'), 'GET /api/v1/prices': () => PRICES })
    renderWithProviders(<App />, { route: '/prices' })
    await screen.findAllByText('RWF 1,200')
    expect(screen.queryByRole('button', { name: /change price|set price|set a price/i })).not.toBeInTheDocument()
  })

  it('filters price history by grade', async () => {
    mockApi({
      ...handlers(),
      'GET /api/v1/prices': () => ({
        ...PRICES,
        history: [...PRICES.history, { id: 2, grade: 'B', pricePerKg: 800, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true }],
      }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/prices' })
    const table = await screen.findByRole('table', { name: 'Price history' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    await user.selectOptions(screen.getByLabelText('Grade'), 'B')
    expect(within(await screen.findByRole('table', { name: 'Price history' })).getAllByRole('row')).toHaveLength(2)
  })
})

describe('grading form', () => {
  it('uses the configured grades, collects moisture and notes, and never sends an amount', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/deliveries/42': () => makeDelivery(),
      'GET /api/v1/deliveries/42/audit': () => [],
      'GET /api/v1/grades': () => [...GRADES, makeGrade({ id: 3, code: 'AA', name: 'Grade AA', description: 'Top lot' })],
      'GET /api/v1/prices': () => ({ current: [...PRICES.current, { id: 9, grade: 'AA', pricePerKg: 1500, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true }], history: [] }),
      'POST /api/v1/deliveries/42/grade': () => makeDelivery({ status: 'GRADED', grade: 'AA', pricePerKg: 1500, amountOwed: 525000, allowedActions: [] }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })

    await user.click(await screen.findByRole('button', { name: /grade dlv/i }))
    const dialog = await screen.findByRole('dialog')
    // grade B has no price, so it can't be chosen
    expect(await within(dialog).findByLabelText(/grade b/i)).toBeDisabled()

    await user.click(await within(dialog).findByLabelText(/grade aa/i))
    expect(await within(dialog).findByText('RWF 525,000')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/moisture/i), '120')
    await user.click(within(dialog).getByRole('button', { name: 'Grade AA' }))
    expect(await within(dialog).findByText(/percentage from 0 to 100/i)).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/deliveries/42/grade')).toHaveLength(0)

    await user.clear(within(dialog).getByLabelText(/moisture/i))
    await user.type(within(dialog).getByLabelText(/moisture/i), '11.5')
    await user.type(within(dialog).getByLabelText(/notes/i), 'Bright red, uniform')
    await user.click(within(dialog).getByRole('button', { name: 'Grade AA' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries/42/grade')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/deliveries/42/grade')[0].body).toEqual({ grade: 'AA', moisturePercent: 11.5, notes: 'Bright red, uniform' })
  })
})

describe('daily intake: adjusting capacity', () => {
  const handlers = (role: 'CLERK' | 'SUPERVISOR') => ({
    ...asRole(role),
    'GET /api/v1/capacity': () => makeCapacity({ acceptedKg: 4800, remainingKg: 200 }),
    'GET /api/v1/deliveries': () => page([makeDelivery()]),
    'GET /api/v1/farmers': () => page([]),
  })

  it('lets a supervisor raise the limit for the day with a reason, never below what is accepted', async () => {
    const api = mockApi({
      ...handlers('SUPERVISOR'),
      'PUT /api/v1/capacity/limit': () => makeCapacity({ dailyLimitKg: 6000, acceptedKg: 4800, remainingKg: 1200 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/daily-intake' })

    await user.click(await screen.findByRole('button', { name: /adjust capacity/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Save new limit' })).toBeDisabled()

    await user.clear(within(dialog).getByLabelText(/new limit/i))
    await user.type(within(dialog).getByLabelText(/new limit/i), '4000')
    await user.type(within(dialog).getByLabelText(/reason/i), 'testing')
    await user.click(within(dialog).getByRole('button', { name: 'Save new limit' }))
    expect(await within(dialog).findByText(/cannot be lower than the 4,800 kg already accepted/i)).toBeInTheDocument()
    expect(api.find('PUT', '/api/v1/capacity/limit')).toHaveLength(0)

    await user.clear(within(dialog).getByLabelText(/new limit/i))
    await user.type(within(dialog).getByLabelText(/new limit/i), '6000')
    await user.clear(within(dialog).getByLabelText(/reason/i))
    await user.type(within(dialog).getByLabelText(/reason/i), 'Extra drying beds available')
    expect(within(dialog).getByText(/Adds 1,000 kg of headroom/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save new limit' }))
    await waitFor(() => expect(api.find('PUT', '/api/v1/capacity/limit')).toHaveLength(1))
    expect(api.find('PUT', '/api/v1/capacity/limit')[0].body).toEqual({ limitKg: 6000, reason: 'Extra drying beds available' })
  })

  it('does not offer the adjustment to a clerk', async () => {
    mockApi(handlers('CLERK'))
    renderWithProviders(<App />, { route: '/daily-intake' })
    await screen.findByText('Total deliveries')
    expect(screen.queryByRole('button', { name: /adjust capacity/i })).not.toBeInTheDocument()
  })
})

describe('tables', () => {
  it('lets you choose how many rows to show and filter the grading queue by farmer', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/deliveries': () => ({ content: [makeDelivery()], page: 0, size: 20, totalElements: 45, totalPages: 3 }),
      'GET /api/v1/farmers': () => page([]),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/grading' })

    expect(await screen.findByText(/45 deliveries waiting/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Rows per page'), '50')
    await waitFor(() => expect(api.calls.filter((c) => c.path === '/api/v1/deliveries').length).toBeGreaterThan(1))
    expect(screen.getByLabelText('Farmer')).toBeInTheDocument()
    expect(screen.getByLabelText('Delivered from')).toBeInTheDocument()
  })
})


describe('permission management', () => {
  const roles = [
    { id: 1, name: 'Administrator', accessLevel: 'ADMIN', systemRole: true, active: true, users: 1, permissions: ['DELIVERY_CREATE', 'PERMISSION_MANAGE'], createdAt: '2026-01-01T00:00:00Z' },
    { id: 3, name: 'Clerk', accessLevel: 'CLERK', systemRole: true, active: true, users: 4, permissions: ['DELIVERY_CREATE'], createdAt: '2026-01-01T00:00:00Z' },
  ]
  const catalogue = [
    { code: 'DELIVERY_CREATE', group: 'Deliveries', label: 'Record deliveries', description: 'Receive a delivery.' },
    { code: 'DELIVERY_PAY', group: 'Deliveries', label: 'Pay deliveries', description: 'Mark as paid.' },
  ]
  const handlers = () => ({ ...asRole('ADMIN'), 'GET /api/v1/roles': () => roles, 'GET /api/v1/permissions': () => catalogue })

  it('saves only the roles that changed and locks the Administrator column', async () => {
    const api = mockApi({ ...handlers(), 'PUT /api/v1/roles/3/permissions': () => ({ ...roles[1], permissions: ['DELIVERY_CREATE', 'DELIVERY_PAY'] }) })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/users?tab=permissions' })

    const pay = await screen.findByRole('checkbox', { name: 'Clerk: Pay deliveries' })
    expect(screen.getByRole('checkbox', { name: 'Administrator: Pay deliveries' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.click(pay)
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save changes \(1\)/i }))
    await waitFor(() => expect(api.find('PUT', '/api/v1/roles/3/permissions')).toHaveLength(1))
    expect(api.find('PUT', '/api/v1/roles/3/permissions')[0].body).toEqual({ permissions: ['DELIVERY_CREATE', 'DELIVERY_PAY'] })
    expect(api.find('PUT', '/api/v1/roles/1/permissions')).toHaveLength(0)
  })

  it('is read-only without the manage permission', async () => {
    mockApi({ ...asRole('ADMIN'), 'POST /api/v1/auth/refresh': () => ({ accessToken: 't', expiresInSeconds: 1800, user: makeUser('ADMIN', { permissions: ['USER_MANAGE'] }) }), 'GET /api/v1/roles': () => roles, 'GET /api/v1/permissions': () => catalogue })
    renderWithProviders(<App />, { route: '/users?tab=permissions' })
    expect(await screen.findByRole('checkbox', { name: 'Clerk: Pay deliveries' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })
})

describe('system settings', () => {
  it('edits and saves only the changed settings, validating first', async () => {
    let stored = SYSTEM_SETTINGS
    const api = mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/system-settings': () => stored,
      'PUT /api/v1/system-settings': ({ body }) => (stored = { ...SYSTEM_SETTINGS, values: { ...SYSTEM_SETTINGS.values, ...(body as { values: object }).values } }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/settings' })

    const name = await screen.findByLabelText(/organisation name/i)
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText('Organisation name is required')).toBeInTheDocument()
    expect(api.find('PUT', '/api/v1/system-settings')).toHaveLength(0)

    await user.type(name, 'Nduba Cooperative')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    await waitFor(() => expect(api.find('PUT', '/api/v1/system-settings')).toHaveLength(1))
    expect(api.find('PUT', '/api/v1/system-settings')[0].body).toEqual({ values: { 'organization.name': 'Nduba Cooperative' } })
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
    expect((await screen.findAllByText('Nduba Cooperative')).length).toBeGreaterThan(0)   // sidebar subtitle
  })

  it('shows settings read-only to someone without the permission', async () => {
    mockApi(asRole('CLERK'))
    renderWithProviders(<App />, { route: '/settings' })
    expect(await screen.findByLabelText(/organisation name/i)).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
  })
})

describe('permission gating and configured defaults', () => {
  it('hides record and edit actions from someone whose role lacks them', async () => {
    mockApi({
      'POST /api/v1/auth/refresh': () => ({ accessToken: 't', expiresInSeconds: 1800, user: makeUser('CLERK', { permissions: [] }) }),
      'GET /api/v1/farmers': () => page([]),
      'GET /api/v1/farmers/summary': () => ({ total: 0, active: 0, inactive: 0, deliveriesToday: 0 }),
    })
    renderWithProviders(<App />, { route: '/farmers' })
    await screen.findByRole('heading', { name: 'Farmers' })
    expect(screen.queryByRole('button', { name: /register farmer/i })).not.toBeInTheDocument()
  })

  it('blocks the new-delivery page without the create permission', async () => {
    mockApi({ 'POST /api/v1/auth/refresh': () => ({ accessToken: 't', expiresInSeconds: 1800, user: makeUser('CLERK', { permissions: [] }) }) })
    renderWithProviders(<App />, { route: '/deliveries/new' })
    expect(await screen.findByRole('heading', { name: /don't have access/i })).toBeInTheDocument()
  })

  it('offers the configured rejection reasons and fills the reason from them', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/deliveries/42': () => makeDelivery(),
      'GET /api/v1/deliveries/42/audit': () => [],
      'POST /api/v1/deliveries/42/reject': () => makeDelivery({ status: 'REJECTED', allowedActions: [] }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })
    await user.click(await screen.findByRole('button', { name: /reject dlv/i }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Common reasons'), 'Excess moisture and debris')
    expect(within(dialog).getByLabelText(/rejection reason/i)).toHaveValue('Excess moisture and debris')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await user.click(await within(dialog).findByRole('button', { name: 'Reject delivery' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries/42/reject')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/deliveries/42/reject')[0].body).toEqual({ reason: 'Excess moisture and debris' })
  })

  it('pre-fills a new station from the configured defaults', async () => {
    mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/system-settings': () => ({ ...SYSTEM_SETTINGS, values: { ...SYSTEM_SETTINGS.values, 'station.default-daily-capacity-kg': '8000' } }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/stations' })
    await user.click(await screen.findByRole('button', { name: /register station/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/daily capacity/i)).toHaveValue(8000)
  })
})



describe('mobile', () => {
  it('searches farmers on the server as you type and shows the chosen one as a card', async () => {
    const queries: string[] = []
    mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/farmers': ({ query }) => {
        queries.push(query.get('q') ?? '')
        return page([makeFarmer({ fullName: 'Jean Example', cooperativeNumber: 'NDB-2001' })])
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.type(await screen.findByRole('combobox', { name: /farmer/i }), 'jea')
    await waitFor(() => expect(queries).toContain('jea'))
    await user.click(await screen.findByRole('button', { name: /Jean Example/ }))
    expect(screen.getByTestId('selected-farmer')).toHaveTextContent('NDB-2001')
    await user.click(screen.getByRole('button', { name: 'Change farmer' }))
    expect(await screen.findByRole('combobox', { name: /farmer/i })).toBeInTheDocument()
  })

  it('offers the clerk quick navigation and hides Record without the permission', async () => {
    mockApi({ 'POST /api/v1/auth/refresh': () => ({ accessToken: 't', expiresInSeconds: 1800, user: makeUser('CLERK', { permissions: [] }) }) })
    renderWithProviders(<App />, { route: '/' })
    const nav = await screen.findByRole('navigation', { name: 'Quick navigation' })
    expect(within(nav).getByRole('link', { name: 'Deliveries' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Farmers' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Record' })).not.toBeInTheDocument()
  })
})

describe('company logo and profile photo', () => {
  const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' })
  const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement
  const uploader = () => userEvent.setup({ applyAccept: false })   // so wrong file types reach our own validation

  it('lets an administrator upload a logo, which then replaces the cherry mark', async () => {
    let branding: { logoVersion: number | null; organizationName: string } = { logoVersion: null, organizationName: 'Nduba Cooperative' }
    const api = mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/branding': () => branding,
      'PUT /api/v1/branding/logo': () => (branding = { logoVersion: 1700000000000, organizationName: 'Nduba Cooperative' }),
    })
    const user = uploader()
    renderWithProviders(<App />, { route: '/settings' })

    expect(await screen.findByText('No logo yet')).toBeInTheDocument()
    await user.upload(fileInput(), png())
    await waitFor(() => expect(api.find('PUT', '/api/v1/branding/logo')).toHaveLength(1))
    expect(api.find('PUT', '/api/v1/branding/logo')[0].body).toEqual({ file: 'logo.png' })
    expect(await screen.findByText('Company logo updated.')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Nduba Cooperative logo' })).toHaveAttribute('src', expect.stringContaining('/api/v1/branding/logo?v=1700000000000'))
    expect(screen.getByRole('button', { name: /replace logo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove logo/i })).toBeInTheDocument()
  })

  it('uses the logo as the browser-tab icon, and the cherries when there is none', async () => {
    let branding: { logoVersion: number | null; organizationName: string } = { logoVersion: 42, organizationName: 'CherryTrack' }
    mockApi({ ...asRole('ADMIN'), 'GET /api/v1/branding': () => branding })
    const icon = () => document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!
    const { unmount } = renderWithProviders(<App />, { route: '/settings' })
    await waitFor(() => expect(icon().getAttribute('href')).toContain('/api/v1/branding/logo?v=42'))
    unmount()

    branding = { logoVersion: null, organizationName: 'CherryTrack' }
    renderWithProviders(<App />, { route: '/settings' })
    await waitFor(() => expect(icon().getAttribute('href')).toBe('/favicon.svg'))
    expect(icon().getAttribute('type')).toBe('image/svg+xml')
  })

  it('refuses the wrong file type and oversized images before sending anything', async () => {
    const api = mockApi({ ...asRole('ADMIN') })
    const user = uploader()
    renderWithProviders(<App />, { route: '/settings' })
    await screen.findByText('No logo yet')

    await user.upload(fileInput(), new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))
    expect(await screen.findByText('Use a PNG, JPEG or WebP image.')).toBeInTheDocument()

    await user.upload(fileInput(), new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.png', { type: 'image/png' }))
    expect(await screen.findByText(/larger than 2 MB/i)).toBeInTheDocument()
    expect(api.find('PUT', '/api/v1/branding/logo')).toHaveLength(0)
  })

  it('shows the server\'s reason when it refuses an image', async () => {
    mockApi({
      ...asRole('ADMIN'),
      'PUT /api/v1/branding/logo': () => ({ status: 422, body: { code: 'INVALID_IMAGE', message: 'Use a PNG, JPEG or WebP image.' } }),
    })
    const user = uploader()
    renderWithProviders(<App />, { route: '/settings' })
    await screen.findByText('No logo yet')
    await user.upload(fileInput(), png())
    expect(await screen.findByText('Use a PNG, JPEG or WebP image.')).toBeInTheDocument()
  })

  it('removes the logo', async () => {
    let branding: { logoVersion: number | null; organizationName: string } = { logoVersion: 5, organizationName: 'CherryTrack' }
    const api = mockApi({
      ...asRole('ADMIN'),
      'GET /api/v1/branding': () => branding,
      'DELETE /api/v1/branding/logo': () => (branding = { logoVersion: null, organizationName: 'CherryTrack' }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/settings' })
    await user.click(await screen.findByRole('button', { name: /remove logo/i }))
    await waitFor(() => expect(api.find('DELETE', '/api/v1/branding/logo')).toHaveLength(1))
    expect(await screen.findByText('No logo yet')).toBeInTheDocument()
  })

  it('does not let someone without the settings permission change the logo', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<App />, { route: '/settings' })
    expect(await screen.findByRole('button', { name: /upload logo/i })).toBeDisabled()
  })

  it('uploads and removes my own profile photo', async () => {
    const me = makeUser('CLERK')
    const api = mockApi({
      ...asRole('CLERK'),
      'PUT /api/v1/auth/me/avatar': () => ({ ...me, avatarVersion: 1700000000000 }),
      'DELETE /api/v1/auth/me/avatar': () => me,
      'GET /api/v1/users/1/avatar': () => ({}),
    })
    const user = uploader()
    renderWithProviders(<App />, { route: '/profile' })

    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument()
    await user.upload(await screen.findByRole('button', { name: /upload photo/i }).then(() => fileInput()), new File([new Uint8Array([255, 216, 255])], 'me.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(api.find('PUT', '/api/v1/auth/me/avatar')).toHaveLength(1))
    expect(await screen.findByText('Your photo was updated.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /remove photo/i }))
    await waitFor(() => expect(api.find('DELETE', '/api/v1/auth/me/avatar')).toHaveLength(1))
    expect(await screen.findByText('Your photo was removed.')).toBeInTheDocument()
  })
})
