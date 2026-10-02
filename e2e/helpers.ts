import { expect, type Page } from '@playwright/test'

export type RoleName = 'admin' | 'supervisor' | 'clerk'

export function password(): string {
  const value = process.env.E2E_PASSWORD
  if (!value) throw new Error('Set E2E_PASSWORD to the password of the seeded demo users.')
  return value
}

export async function login(page: Page, user: RoleName): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Username').fill(user)
  await page.getByLabel('Password').fill(password())
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

/** yyyy-MM-dd for N days ago (local). */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** A cooperative number that is unique per test run, so reruns never collide. */
export function uniqueCoop(prefix = 'E2E'): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

/** A valid Rwandan mobile number derived from the clock. */
export function uniquePhone(): string {
  return `078${String(Date.now()).slice(-7)}`
}
