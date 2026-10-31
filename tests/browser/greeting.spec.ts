import { expect, test } from '@playwright/test'

test('visitor submits a name and receives a greeting', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => window.innerWidth)).toBe(page.viewportSize()?.width)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, world!')
  await page.getByLabel('Name').fill('Ada')
  await page.getByRole('button', { name: 'Greet' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!')
  await expect(page).toHaveURL(/name=Ada/)
})

test('visitor input is displayed as text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('<script>alert(1)</script>')
  await page.getByRole('button', { name: 'Greet' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, <script>alert(1)</script>!')
  await expect(page.locator('h1 script')).toHaveCount(0)
})
