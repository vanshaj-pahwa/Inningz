import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(120000);

test('screenshot player position', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    recordVideo: {
      dir: 'test-results/videos',
    }
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
      await page.screenshot({ path: 'test-results/player-deployed.png', fullPage: false });
      console.log('\n✅ Screenshot saved to test-results/player-deployed.png');

      const bbox = await player.boundingBox();
      const viewport = page.viewportSize();

      if (bbox && viewport) {
        console.log('\n========== VISUAL POSITION ==========');
        console.log('Viewport:', viewport);
        console.log('Player bounds:', bbox);
        console.log('Player visible area:');
        console.log('  top visible:', Math.max(0, bbox.y));
        console.log('  bottom visible:', Math.min(viewport.height, bbox.y + bbox.height));
        console.log('  is at bottom?', bbox.y + bbox.height >= viewport.height - 50);
      }
    }
  }

  await context.close();
});
