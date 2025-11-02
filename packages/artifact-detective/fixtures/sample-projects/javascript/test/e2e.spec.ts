import { test, expect } from '@playwright/test'

test('simple navigation pass', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toHaveTitle(/Example/)
})

test('page content check', async ({ page }) => {
  await page.goto('https://example.com')
  const content = await page.textContent('h1')
  expect(content).toBeTruthy()
})

test('url verification', async ({ page }) => {
  await page.goto('https://example.com')
  expect(page.url()).toContain('example.com')
})

test('deliberate failure', async ({ page }) => {
  await page.goto('https://example.com')
  await expect(page).toHaveTitle(/NonExistentTitle/) // Fails
})
