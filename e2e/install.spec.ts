import { devices, type Browser } from '@playwright/test';
import { expect, test } from './quiet';
import { newLearner, SHOTS } from './helpers';

const IPHONE_UA = devices['iPhone 15'].userAgent;

async function iphone(browser: Browser) {
  // Chromium with an iPhone's user agent and screen: enough to choose the steps.
  const { viewport, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 15'];
  const ctx = await browser.newContext({ userAgent: IPHONE_UA, viewport, deviceScaleFactor, isMobile, hasTouch });
  return ctx.newPage();
}

test('an Android phone gets Chrome’s steps, and can switch to the iPhone ones', async ({ page }) => {
  await page.goto('/install');
  await expect(page.getByRole('heading', { name: 'Put Ashra on the home screen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Android' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'In Chrome' })).toBeVisible();
  await expect(page.getByText('Tap ⋮ at the top right of Chrome.')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/install-android.png`, fullPage: true });

  await page.getByRole('button', { name: 'iPhone or iPad' }).click();
  await expect(page.getByRole('heading', { name: 'In Safari' })).toBeVisible();
});

test('when Chrome can ask again, one button brings back its own install prompt', async ({ page }) => {
  await page.goto('/install');
  // Headless Chrome never offers to install, so hand the page the event Chrome would send.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    e.prompt = async () => {
      (window as { prompted?: boolean }).prompted = true;
    };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await page.getByRole('button', { name: 'Install Ashra' }).click();
  expect(await page.evaluate(() => (window as { prompted?: boolean }).prompted)).toBe(true);
  await expect(page.getByText('Done! Ashra is on the home screen.')).toBeVisible();
});

test('an iPhone gets Safari’s steps, in Arabic too', async ({ browser }) => {
  const page = await iphone(browser);
  await page.goto('/install');
  await expect(page.getByRole('button', { name: 'iPhone or iPad' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'In Safari' })).toBeVisible();
  await expect(page.getByText('Tap “Share”.')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/install-iphone.png`, fullPage: true });

  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.getByRole('heading', { name: 'في Safari' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/install-iphone-ar.png`, fullPage: true });
});

test('a child’s home screen suggests it once, and “Not now” puts it away', async ({ browser, request }) => {
  const learner = await newLearner(request, {}, 'Noor');
  const phone = await iphone(browser);
  const { code } = await (await request.post(`/api/learners/${learner.id}/pairing-code`)).json();
  await phone.goto('/');
  await expect(phone.getByRole('button', { name: 'Install as an app' })).toBeVisible();
  await phone.getByRole('button', { name: 'I already use Ashra on another phone' }).click();
  await phone.getByLabel('Code').fill(code);
  await phone.getByRole('button', { name: 'Carry on' }).click();
  await expect(phone.getByRole('heading', { name: 'Put Ashra on your home screen' })).toBeVisible();
  await phone.screenshot({ path: `${SHOTS}/install-home-card.png` });

  await phone.getByRole('button', { name: 'Show me how' }).click();
  await expect(phone.getByRole('heading', { name: 'In Safari' })).toBeVisible();
  await phone.getByRole('button', { name: 'Back' }).click();
  await phone.getByRole('button', { name: 'Not now' }).click();
  await expect(phone.getByRole('heading', { name: 'Put Ashra on your home screen' })).toHaveCount(0);
  await phone.reload();
  await expect(phone.getByRole('heading', { name: 'Hi, Noor' })).toBeVisible();
  await expect(phone.getByRole('heading', { name: 'Put Ashra on your home screen' })).toHaveCount(0);

  // Still there for later, from the child's own page.
  await phone.goto('/me');
  await expect(phone.getByRole('heading', { name: 'On the home screen' })).toBeVisible();
});
