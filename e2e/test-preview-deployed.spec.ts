import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(120000);

test('check preview deployment', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();

  console.log('\n========== PREVIEW DEPLOYMENT TEST ==========');

  await page.goto('https://inningz-b5890ezt8-vanshajpahwa07s-projects.vercel.app/news/1547813/saransh-jain-gets-maiden-india-call-up-for-test-series-in-sri-lanka', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  const listenButton = page.locator('[aria-label*="Listen"]').first();

  if (await listenButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('✅ Found listen button');
    await listenButton.click();
    await page.waitForTimeout(1000);

    const player = page.locator('[role="region"][aria-label*="Article audio player"]');

    if (await player.isVisible({ timeout: 5000 }).catch(() => false)) {
      const bbox = await player.boundingBox();
      const viewport = page.viewportSize();

      if (bbox && viewport) {
        const distFromTop = bbox.y;
        const distFromBottom = viewport.height - (bbox.y + bbox.height);

        console.log('\n========== RESULT ==========');
        console.log('Player Y position:', bbox.y);
        console.log('Distance from TOP:', distFromTop);
        console.log('Distance from BOTTOM:', distFromBottom);

        if (distFromTop < 100) {
          console.log('\n❌ PLAYER IS AT TOP (BROKEN)');
        } else if (distFromBottom < 50) {
          console.log('\n✅✅✅ PLAYER IS AT BOTTOM (FIXED!!!) ✅✅✅');
        }

        const styles = await player.evaluate((el) => {
          const c = window.getComputedStyle(el);
          return { bottom: c.bottom, top: c.top };
        });

        console.log('\nComputed styles:');
        console.log('  bottom:', styles.bottom);
        console.log('  top:', styles.top);
      }
    } else {
      console.log('❌ Player not visible');
    }
  } else {
    console.log('❌ Listen button not found');
  }

  await context.close();
});
