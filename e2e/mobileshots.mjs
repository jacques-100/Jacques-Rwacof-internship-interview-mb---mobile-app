import { chromium, devices } from '@playwright/test'

const out = process.env.SHOT_DIR
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 360, height: 740 } })
const page = await ctx.newPage()
const base = 'http://localhost:5173'
await page.goto(`${base}/login`)
await page.getByLabel('Username').fill('clerk')
await page.getByLabel('Password').fill(process.env.E2E_PASSWORD)
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: 'Dashboard' }).first().waitFor()
const shot = async (name, url) => {
  if (url) await page.goto(`${base}${url}`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/m-${name}.png` })
}
await shot('1-dashboard')
await shot('2-deliveries', '/deliveries')
await shot('3-new', '/deliveries/new')
await shot('4-intake', '/daily-intake')
await shot('5-farmers', '/farmers')
await page.goto(base+'/deliveries'); await page.waitForTimeout(1500); await page.getByRole('button', { name: /^grade dlv/i }).first().click().catch(()=>{}); await page.waitForTimeout(800); await page.screenshot({ path: out+'/m-7-dialog.png' }); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'More' }).click()
await shot('6-more')
await browser.close()
