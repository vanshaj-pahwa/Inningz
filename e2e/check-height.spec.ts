import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(120000);

test('check if player or parent has height constraint', async ({ browser }) => {
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
      const info = await player.evaluate((el) => {
        const c = window.getComputedStyle(el);
        const child = el.firstElementChild as HTMLElement;
        const childC = child ? window.getComputedStyle(child) : null;

        return {
          player: {
            width: c.width,
            height: c.height,
            minHeight: c.minHeight,
            maxHeight: c.maxHeight,
            display: c.display,
            overflow: c.overflow,
          },
          firstChild: childC ? {
            height: childC.height,
            display: childC.display,
          } : null,
          innerHTML: el.innerHTML.substring(0, 200),
        };
      });

      console.log('\n========== HEIGHT/DIMENSION CHECK ==========');
      console.log('Player computed dimensions:');
      console.log('  width:', info.player.width);
      console.log('  height:', info.player.height);
      console.log('  minHeight:', info.player.minHeight);
      console.log('  maxHeight:', info.player.maxHeight);
      console.log('  display:', info.player.display);
      console.log('  overflow:', info.player.overflow);
      console.log('\nFirst child (if exists):');
      console.log('  height:', info.firstChild?.height);
      console.log('  display:', info.firstChild?.display);
    }
  }

  await context.close();
});
