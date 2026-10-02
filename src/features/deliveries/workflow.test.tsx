import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'
import { makeCapacity, makeDelivery, makeFarmer, page } from '@/test/fixtures'
import { asRole, mockApi, renderWithProviders } from '@/test/utils'
import { DeliveryActions } from './DeliveryActions'

const PRICES = {
  current: [
    { id: 1, grade: 'A', pricePerKg: 1200, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true },
    { id: 2, grade: 'B', pricePerKg: 800, effectiveFrom: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z', current: true },
  ],
  history: [],
}

const DETAIL = (d = makeDelivery()) => ({ 'GET /api/v1/deliveries/42': () => d, 'GET /api/v1/deliveries/42/audit': () => [] })

describe('which actions are offered', () => {
  it('RECEIVED offers correct weight, grade and reject only', async () => {
    mockApi({ ...asRole('CLERK') })
    renderWithProviders(<DeliveryActions delivery={makeDelivery()} />)
    expect(screen.getByRole('button', { name: /grade dlv/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /correct weight/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject dlv/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /paid/i })).not.toBeInTheDocument()
  })

  it('GRADED offers payment to a supervisor and nothing to a clerk', () => {
    mockApi({ ...asRole('SUPERVISOR') })
    const { unmount } = renderWithProviders(<DeliveryActions delivery={makeDelivery({ status: 'GRADED', allowedActions: ['PAY'] })} />)
    expect(screen.getByRole('button', { name: /as paid/i })).toBeInTheDocument()
    unmount()
    renderWithProviders(<DeliveryActions delivery={makeDelivery({ status: 'GRADED', allowedActions: [] })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('PAID and REJECTED offer no modification actions', () => {
    mockApi({})
    const { unmount } = renderWithProviders(<DeliveryActions delivery={makeDelivery({ status: 'PAID', allowedActions: [] })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    unmount()
    renderWithProviders(<DeliveryActions delivery={makeDelivery({ status: 'REJECTED', allowedActions: [] })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('grading', () => {
  it('shows the price and calculated amount, and submits only the grade', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      ...DETAIL(),
      'GET /api/v1/prices': () => PRICES,
      'POST /api/v1/deliveries/42/grade': () => makeDelivery({ status: 'GRADED', grade: 'A', pricePerKg: 1200, amountOwed: 420000, allowedActions: [] }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })

    await user.click(await screen.findByRole('button', { name: /grade dlv/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Select a grade' })).toBeDisabled()

    await user.click(await within(dialog).findByLabelText(/grade a/i))
    expect(await within(dialog).findByText('RWF 420,000')).toBeInTheDocument()
    expect(within(dialog).getByText(/350 kg × RWF 1,200\/kg/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Grade A' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries/42/grade')).toHaveLength(1))
    // the client never sends a price or amount
    expect(api.find('POST', '/api/v1/deliveries/42/grade')[0].body).toEqual({ grade: 'A' })
  })
})

describe('rejection', () => {
  it('requires a reason, then an explicit irreversible-action confirmation', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      ...DETAIL(),
      'POST /api/v1/deliveries/42/reject': () => makeDelivery({ status: 'REJECTED', rejectReason: 'Unripe cherries', allowedActions: [] }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })

    await user.click(await screen.findByRole('button', { name: /reject dlv/i }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await within(dialog).findByText(/give a reason/i)).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/deliveries/42/reject')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText(/rejection reason/i), 'Unripe cherries')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await within(dialog).findByText('This action cannot be reversed.')).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/deliveries/42/reject')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Reject delivery' }))
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries/42/reject')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/deliveries/42/reject')[0].body).toEqual({ reason: 'Unripe cherries' })
  })
})

describe('payment', () => {
  it('keeps the button disabled until the payment is explicitly confirmed', async () => {
    const graded = makeDelivery({ status: 'GRADED', grade: 'A', pricePerKg: 1200, amountOwed: 420000, allowedActions: ['PAY'] })
    const api = mockApi({
      ...asRole('SUPERVISOR'),
      ...DETAIL(graded),
      'POST /api/v1/deliveries/42/pay': () => ({ ...graded, status: 'PAID', allowedActions: [] }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })

    await user.click(await screen.findByRole('button', { name: /as paid/i }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Mark as paid' })
    expect(confirm).toBeDisabled()

    await user.click(within(dialog).getByRole('checkbox'))
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries/42/pay')).toHaveLength(1))
    expect(api.find('POST', '/api/v1/deliveries/42/pay')[0].body).toBeUndefined()
  })
})

describe('weight correction', () => {
  it('validates, shows the change for confirmation and records the reason', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      ...DETAIL(makeDelivery({ weightKg: 300 })),
      'GET /api/v1/capacity/preview': () => ({ date: '2026-10-01', acceptedKg: 4650, dailyLimitKg: 5000, remainingKg: 350 }),
      'PATCH /api/v1/deliveries/42/weight': () => makeDelivery({ weightKg: 350 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/42' })

    await user.click(await screen.findByRole('button', { name: /correct weight/i }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText(/new weight/i), '600')
    await user.type(within(dialog).getByLabelText(/reason/i), 'Scale correction after verification')
    await user.click(within(dialog).getByRole('button', { name: 'Review change' }))
    expect(await within(dialog).findByText(/cannot exceed 500 kg/i)).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText(/new weight/i))
    await user.type(within(dialog).getByLabelText(/new weight/i), '350')
    await user.click(within(dialog).getByRole('button', { name: 'Review change' }))
    expect(await within(dialog).findByText('Confirm weight correction')).toBeInTheDocument()
    expect(within(dialog).getByText('350 kg', { selector: 'p' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Confirm correction' }))
    await waitFor(() => expect(api.find('PATCH', '/api/v1/deliveries/42/weight')).toHaveLength(1))
    expect(api.find('PATCH', '/api/v1/deliveries/42/weight')[0].body).toEqual({ newWeightKg: 350, reason: 'Scale correction after verification' })
  })
})

describe('recording a delivery', () => {
  const farmers = page([makeFarmer()])

  function setup(extra: Parameters<typeof mockApi>[0] = {}, preview = { acceptedKg: 4650, remainingKg: 350 }) {
    return mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/farmers': () => farmers,
      'GET /api/v1/capacity/preview': () => ({ date: '2026-10-01', dailyLimitKg: 5000, ...preview }),
      ...extra,
    })
  }

  it('does not ask for grade or amount', async () => {
    setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })
    await screen.findByLabelText(/weight/i)
    expect(screen.queryByLabelText(/grade/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument()
  })

  it('validates farmer and weight before submitting', async () => {
    const api = setup()
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.type(await screen.findByLabelText(/weight/i), '0')
    await user.click(screen.getByRole('button', { name: 'Record delivery' }))

    expect(await screen.findByText('Select a farmer')).toBeInTheDocument()
    expect(screen.getByText('Weight must be greater than 0 kg')).toBeInTheDocument()
    expect(api.find('POST', '/api/v1/deliveries')).toHaveLength(0)

    await user.clear(screen.getByLabelText(/weight/i))
    await user.type(screen.getByLabelText(/weight/i), '501')
    await user.click(screen.getByRole('button', { name: 'Record delivery' }))
    expect(await screen.findByText(/cannot exceed 500 kg/i)).toBeInTheDocument()
  })

  it('previews current, new and resulting capacity as you type', async () => {
    setup()
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.type(await screen.findByLabelText(/weight/i), '200')
    await waitFor(() => expect(screen.getByText('After this delivery').nextSibling).toHaveTextContent('4,850 kg'))
    expect(screen.getByText('Current accepted').nextSibling).toHaveTextContent('4,650 kg')
    expect(screen.getByText('Remaining after').nextSibling).toHaveTextContent('150 kg')
  })

  it('warns and blocks submit when the delivery would exceed capacity', async () => {
    setup()
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.type(await screen.findByLabelText(/weight/i), '400')
    expect(await screen.findByText('This would exceed the daily capacity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record delivery' })).toBeDisabled()
  })

  it('submits only farmer, date and weight, then opens the new delivery', async () => {
    const api = setup({
      'POST /api/v1/deliveries': () => ({ status: 201, body: makeDelivery({ id: 77, reference: 'DLV-NDB-20261001-00077' }) }),
      'GET /api/v1/deliveries/77': () => makeDelivery({ id: 77, reference: 'DLV-NDB-20261001-00077' }),
      'GET /api/v1/deliveries/77/audit': () => [],
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.click(await screen.findByRole('button', { name: /Marie Claire/ }))
    await user.type(screen.getByLabelText(/weight/i), '120.5')
    await user.click(screen.getByRole('button', { name: 'Record delivery' }))

    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries')).toHaveLength(1))
    const body = api.find('POST', '/api/v1/deliveries')[0].body as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['deliveryDate', 'farmerId', 'weightKg'])
    expect(body.farmerId).toBe(7)
    expect(body.weightKg).toBe(120.5)
    expect(await screen.findByRole('heading', { name: /DLV-NDB-20261001-00077/ })).toBeInTheDocument()
  })

  it('shows the server error when the backend refuses (final capacity check)', async () => {
    setup(
      { 'POST /api/v1/deliveries': () => ({ status: 409, body: { code: 'CAPACITY_EXCEEDED', message: 'Recording this delivery would exceed the daily station capacity of 5000 kg.' } }) },
      { acceptedKg: 1000, remainingKg: 4000 },
    )
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.click(await screen.findByRole('button', { name: /Marie Claire/ }))
    await user.type(screen.getByLabelText(/weight/i), '100')
    await user.click(screen.getByRole('button', { name: 'Record delivery' }))

    expect(await screen.findByText(/would exceed the daily station capacity/i)).toBeInTheDocument()
  })

  it('prevents duplicate submissions while the request is running', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    const api = setup({
      // the response is held open until released, so both clicks land while the first request is in flight
      'POST /api/v1/deliveries': async () => {
        await gate
        return { status: 201, body: makeDelivery({ id: 78 }) }
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/deliveries/new' })

    await user.click(await screen.findByRole('button', { name: /Marie Claire/ }))
    await user.type(screen.getByLabelText(/weight/i), '100')
    const button = screen.getByRole('button', { name: 'Record delivery' })
    await user.click(button)
    await user.click(button)
    await user.click(button)
    await waitFor(() => expect(api.find('POST', '/api/v1/deliveries')).toHaveLength(1))
    release()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Record delivery' })).not.toBeInTheDocument())
    expect(api.find('POST', '/api/v1/deliveries')).toHaveLength(1)
  })
})

describe('daily intake page', () => {
  it('shows capacity stats and lets you move between days', async () => {
    const api = mockApi({
      ...asRole('CLERK'),
      'GET /api/v1/capacity': () => makeCapacity(),
      'GET /api/v1/deliveries': () => page([makeDelivery()]),
      'GET /api/v1/farmers': () => page([makeFarmer()]),
    })
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/daily-intake' })

    expect(await screen.findByText('Total deliveries')).toBeInTheDocument()
    expect(screen.getByText('Rejected weight')).toBeInTheDocument()
    expect(screen.getByText('Average delivery weight')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()   // can't go past today

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() => expect(api.find('GET', '/api/v1/capacity').length).toBeGreaterThan(1))
  })
})
