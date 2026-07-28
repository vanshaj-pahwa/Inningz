import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(120000);

test('debug player bounds and parent', async ({ browser }) => {
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
      const debug = await player.evaluate((el) => {
        const bbox = el.getBoundingClientRect();
        const parentBbox = el.parentElement?.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        const parentComputed = el.parentElement ? window.getComputedStyle(el.parentElement) : null;

        return {
          playerBbox: {
            top: bbox.top,
            bottom: bbox.bottom,
            left: bbox.left,
            right: bbox.right,
            height: bbox.height,
            width: bbox.width,
          },
          parentBbox: parentBbox ? {
            top: parentBbox.top,
            bottom: parentBbox.bottom,
            left: parentBbox.left,
            right: parentBbox.right,
            height: parentBbox.height,
            width: parentBbox.width,
          } : null,
          computed: {
            bottom: computed.bottom,
            top: computed.top,
            position: computed.position,
            height: computed.height,
          },
          parentComputed: parentComputed ? {
            position: parentComputed.position,
            display: parentComputed.display,
          } : null,
          viewportHeight: window.innerHeight,
        };
      });

      console.log('\n========== FULL DEBUG INFO ==========');
      console.log('ACTUAL PLAYER BOUNDS (getBoundingClientRect):');
      console.log('  top:', debug.playerBbox.top);
      console.log('  bottom:', debug.playerBbox.bottom);
      console.log('  height:', debug.playerBbox.height);
      console.log('\nCOMPUTED CSS:');
      console.log('  top:', debug.computed.top);
      console.log('  bottom:', debug.computed.bottom);
      console.log('  position:', debug.computed.position);
      console.log('\nVIEWPORT:');
      console.log('  height:', debug.viewportHeight);
      console.log('  distance from viewport bottom:', debug.viewportHeight - debug.playerBbox.bottom);
      console.log('\nPARENT:');
      console.log('  position:', debug.parentComputed?.position);
      console.log('  display:', debug.parentComputed?.display);
      console.log('  bounds:', debug.parentBbox);
    }
  }

  await context.close();
});
