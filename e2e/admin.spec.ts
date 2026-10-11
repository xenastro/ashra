import { expect, test } from './quiet';
import { newLearner, seedFluentCheckup, SHOTS } from './helpers';

const W = 360;
const H = 740;

// Needs ADMIN_EMAILS=admin@example.com in .dev.vars.
test('the person running Ashra sees every family and opens any child, read-only', async ({ browser, playwright, baseURL }) => {
  // A family whose child has practised.
  const family = await playwright.request.newContext({ baseURL });
  const learner = await newLearner(family, {}, `Kid${Date.now() % 10000}`);
  await seedFluentCheckup(family, learner.id);

  const admin = await playwright.request.newContext({ baseURL });
  const signup = await admin.post('/api/auth/signup', { data: { email: 'admin@example.com', password: 'admin password' } });
  if (signup.status() === 409) {
    const login = await admin.post('/api/auth/login', { data: { email: 'admin@example.com', password: 'admin password' } });
    expect(login.status(), 'signing in as admin (429: run `npm run test:reset-limits`)').toBe(200);
  }
  test.skip(!(await (await admin.get('/api/auth/me')).json()).admin, 'ADMIN_EMAILS is not set on the local Worker');

  // An ordinary parent has no way in.
  const parent = await browser.newContext({ viewport: { width: W, height: H }, storageState: await family.storageState() });
  const parentPage = await parent.newPage();
  await parentPage.goto('/parent');
  await expect(parentPage.getByRole('heading', { name: 'Parent area' })).toBeVisible();
  await expect(parentPage.getByRole('button', { name: /Families & children/ })).toHaveCount(0);
  await parentPage.goto('/parent/admin');
  await expect(parentPage.getByRole('heading', { name: 'Parent area' })).toBeVisible();

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, storageState: await admin.storageState() });
  const page = await ctx.newPage();
  await page.goto('/parent');
  await page.getByRole('button', { name: /Families & children/ }).click();
  await expect(page.getByRole('heading', { name: 'Families & children' })).toBeVisible();
  await expect(page.getByText('Family accounts', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Children practising each day' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/admin-overview.png` });
  await page.screenshot({ path: `${SHOTS}/admin-overview-full.png`, fullPage: true });

  await page.getByRole('button', { name: new RegExp(learner.displayName) }).click();
  await expect(page.getByText('Preview · read only')).toBeVisible();
  await expect(page.getByRole('heading', { name: learner.displayName })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fact map' })).toBeVisible();
  // The family's phones and settings stay theirs.
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Linked phones' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/admin-preview.png`, fullPage: true });

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Families & children' })).toBeVisible();
});
