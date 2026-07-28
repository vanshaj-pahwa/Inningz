import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(120000);

test('inspect deployed player element', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();

  await page.goto('https://inningz.vercel.app/news/1547813/saransh-jain-gets-maiden-india-call-up-for-test-series-in-sri-lanka', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  await page.waitForTimeout(2000);

  const listenButton = page.locator('[aria-label*="Listen"]').first();
  if (await listenButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await listenButton.click();
    await page.waitForTimeout(1000);

    const player = page.locator('[role="region"][aria-label*="Article audio player"]');
    if (await player.isVisible({ timeout: 5000 }).catch(() => false)) {
      const html = await player.evaluate((el) => ({
        outerHTML: el.outerHTML.substring(0, 500),
        inlineStyle: el.getAttribute('style'),
        className: el.getAttribute('class'),
      }));

      console.log('\n========== PLAYER ELEMENT INSPECTION ==========');
      console.log('Inline style attribute:', html.inlineStyle);
      console.log('Class:', html.className);
      console.log('HTML start:', html.outerHTML);
    }
  }

  await context.close();
});
