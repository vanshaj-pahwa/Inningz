import { test } from '@playwright/test';
import { devices } from '@playwright/test';

test.setTimeout(60000);

test('inline header controls on mobile', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/news/1547813/saransh-jain-gets-maiden-india-call-up-for-test-series-in-sri-lanka', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('\n========== INLINE CONTROLS TEST ==========');

  const listenButton = page.locator('[aria-label*="Listen"]').first();
  if (await listenButton.isVisible()) {
    console.log('✅ Listen button found');

    // Before clicking - voice/speed buttons should not be visible
    const voiceBtn = page.locator('[aria-label*="Voice"]');
    const speedBtn = page.locator('[aria-label*="Playback speed"]');

    if (!(await voiceBtn.isVisible().catch(() => false))) {
      console.log('✅ Voice button hidden when idle');
    }
    if (!(await speedBtn.isVisible().catch(() => false))) {
      console.log('✅ Speed button hidden when idle');
    }

    // Click to start listening
    await listenButton.click();
    await page.waitForTimeout(1000);

    // After clicking - controls should appear
    if (await voiceBtn.isVisible().catch(() => false)) {
      console.log('✅ Voice button visible when playing');
    } else {
      console.log('❌ Voice button NOT visible when playing');
    }

    if (await speedBtn.isVisible().catch(() => false)) {
      console.log('✅ Speed button visible when playing');
    } else {
      console.log('❌ Speed button NOT visible when playing');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/inline-controls.png', fullPage: false });
    console.log('📸 Screenshot saved');

    // Test voice dropdown
    if (await voiceBtn.isVisible().catch(() => false)) {
      await voiceBtn.click();
      await page.waitForTimeout(500);
      const voiceMenu = page.locator('[role="menu"]').first();
      if (await voiceMenu.isVisible().catch(() => false)) {
        console.log('✅ Voice dropdown opens');
      }
      await page.keyboard.press('Escape');
    }

    // Test speed dropdown
    if (await speedBtn.isVisible().catch(() => false)) {
      await speedBtn.click();
      await page.waitForTimeout(500);
      const speedMenu = page.locator('[role="menu"]').first();
      if (await speedMenu.isVisible().catch(() => false)) {
        console.log('✅ Speed dropdown opens');
      }
      await page.keyboard.press('Escape');
    }
  }

  await context.close();
});
