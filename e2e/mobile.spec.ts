import { expect, test, type Page } from '@playwright/test'
import { daysAgo, login, uniqueCoop, uniquePhone } from './helpers'

// The clerk's day on a phone (Pixel 7 viewport), using only the phone navigation.
const DAY = daysAgo(50) // an untouched historic day with plenty of capacity

async function registerFarmer(page: Page, name: string, coop: string) {
  await page.goto('/farmers')
  await page.getByRole('button', { name: 'Register farmer' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill(name)
  await dialog.getByLabel('Phone number').fill(uniquePhone())
  await dialog.getByLabel('Cooperative membership number').fill(coop.toLowerCase())
  await dialog.getByRole('button', { name: 'Register farmer' }).click()
  await expect(page.getByText(`${name} registered (${coop})`)).toBeVisible()
}

/** Opens the record form from the middle button of the bottom bar and picks the farmer by searching. */
async function openRecordForm(page: Page, farmerName: string) {
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'Record' }).click()
  await expect(page.getByRole('heading', { name: 'Record new delivery' })).toBeVisible()
  await page.getByRole('combobox', { name: /farmer/i }).fill(farmerName)
  await page.getByRole('option', { name: new RegExp(farmerName) }).getByRole('button').click()
  await expect(page.getByTestId('selected-farmer')).toContainText(farmerName)
  await page.getByLabel('Delivery date').fill(DAY)
}

test.describe('clerk on a phone', () => {
  test('record, correct, grade and pay a delivery from the phone navigation', async ({ page }) => {
    const name = `Mob Farmer ${Date.now().toString(36)}`
    await login(page, 'supervisor')
    await registerFarmer(page, name, uniqueCoop('MOB'))

    await openRecordForm(page, name)
    await page.getByLabel('Weight (kg)').fill('120.5')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByRole('heading', { name: /^Delivery DLV-/ })).toBeVisible()
    await expect(page.getByText('Received', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: /correct weight/i }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('New weight (kg)').fill('150')
    await dialog.getByLabel('Reason').fill('Scale correction')
    await dialog.getByRole('button', { name: 'Review change' }).click()
    await dialog.getByRole('button', { name: 'Confirm correction' }).click()
    await expect(page.getByText('150 kg').first()).toBeVisible()

    await page.getByRole('button', { name: /^grade dlv/i }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByText('Grade A', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Grade A' }).click()
    await expect(page.getByText('Graded', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('RWF 180,000').first()).toBeVisible()   // calculated by the server
    await expect(page.getByRole('button', { name: /correct weight/i })).toHaveCount(0)

    await page.getByRole('button', { name: /as paid/i }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Mark as paid' }).click()
    await expect(page.getByText('This delivery has been paid and can no longer be changed.')).toBeVisible()
    await expect(page.getByRole('button', { name: /grade dlv|reject dlv|as paid|correct weight/i })).toHaveCount(0)

    // the delivery appears as a card on the deliveries list, with its status and amount
    await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'Deliveries' }).click()
    const card = page.getByRole('list', { name: 'Deliveries' }).getByRole('listitem').filter({ hasText: name }).first()
    await expect(card).toContainText('Paid')
    await expect(card).toContainText('RWF 180,000')
  })

  test('rejects a delivery after confirmation', async ({ page }) => {
    const name = `Mob Reject ${Date.now().toString(36)}`
    await login(page, 'supervisor')
    await registerFarmer(page, name, uniqueCoop('MRJ'))
    await openRecordForm(page, name)
    await page.getByLabel('Weight (kg)').fill('80')
    await page.getByRole('button', { name: 'Record delivery' }).click()

    await page.getByRole('button', { name: /reject dlv/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Rejection reason').fill('Unripe cherries')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('This action cannot be reversed.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Reject delivery' }).click()
    await expect(page.getByText('This delivery was rejected and can no longer be changed.')).toBeVisible()
  })

  test('refuses zero, negative, oversized weights and future dates', async ({ page }) => {
    await login(page, 'clerk')
    await page.goto('/deliveries/new')

    await page.getByLabel('Weight (kg)').fill('0')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByText('Select a farmer', { exact: true })).toBeVisible()
    await expect(page.getByText('Weight must be greater than 0 kg')).toBeVisible()

    await page.getByLabel('Weight (kg)').fill('-5')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByText('Weight must be greater than 0 kg')).toBeVisible()

    await page.getByLabel('Weight (kg)').fill('501')
    await page.getByRole('button', { name: 'Record delivery' }).click()
    await expect(page.getByText(/cannot exceed 500 kg/i)).toBeVisible()

    await page.getByLabel('Delivery date').fill('2999-01-01')
    await expect(page.getByText('Delivery date cannot be in the future')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record delivery' })).toBeDisabled()
  })

  test('rapid repeated taps create only one delivery', async ({ page }) => {
    const name = `Mob Double ${Date.now().toString(36)}`
    await login(page, 'supervisor')
    await registerFarmer(page, name, uniqueCoop('DBL'))
    await openRecordForm(page, name)
    await page.getByLabel('Weight (kg)').fill('42')

    const posts: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/v1/deliveries')) posts.push(r.url())
    })
    await page.getByRole('button', { name: 'Record delivery' }).dblclick()
    await expect(page.getByRole('heading', { name: /^Delivery DLV-/ })).toBeVisible()
    expect(posts).toHaveLength(1)
  })

  test('the More menu reaches profile and signs out', async ({ page }) => {
    await login(page, 'clerk')
    await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('button', { name: 'More' }).click()
    const menu = page.getByRole('navigation', { name: 'Main navigation' })
    await expect(menu.getByRole('link', { name: 'Prices & Grades' })).toBeVisible()
    await page.getByRole('link', { name: 'Profile & password' }).click()
    await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()
    await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
