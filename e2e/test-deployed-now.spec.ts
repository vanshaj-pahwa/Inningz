import { test, expect, devices } from '@playwright/test';

test.setTimeout(120000);

test('check deployed version RIGHT NOW', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();

  console.log('\n========== DEPLOYED VERSION TEST ==========');

  await page.goto('https://inningz.vercel.app/news/1547813/saransh-jain-gets-maiden-india-call-up-for-test-series-in-sri-lanka', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  await page.waitForTimeout(2000);

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
        console.log('Viewport height:', viewport.height);

        if (distFromTop < 100) {
          console.log('\n❌ PLAYER IS AT TOP (BROKEN)');
        } else if (distFromBottom < 50) {
          console.log('\n✅ PLAYER IS AT BOTTOM (FIXED)');
        }

        const styles = await player.evaluate((el) => {
          const c = window.getComputedStyle(el);
          return {
            bottom: c.bottom,
            top: c.top,
            position: c.position,
            zIndex: c.zIndex,
            transform: c.transform,
            parentPosition: window.getComputedStyle(el.parentElement!).position
          };
        });

        console.log('Computed style.bottom:', styles.bottom);
        console.log('Computed style.top:', styles.top);
        console.log('Parent element position:', styles.parentPosition);
        console.log('Z-index:', styles.zIndex);
      }
    } else {
      console.log('❌ Player not visible');
    }
  } else {
    console.log('❌ Listen button not found');
  }

  await context.close();
});
