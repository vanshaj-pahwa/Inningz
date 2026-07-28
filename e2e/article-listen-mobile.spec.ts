import { test, expect, devices } from '@playwright/test';

const ARTICLE_URL = '/news/123456/test-article';

test.describe('ArticleListen Mobile Experience', () => {
  // Test on multiple mobile viewports
  const mobileViewports = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] },
    { name: 'iPhone 14 Pro', device: devices['iPhone 14 Pro'] },
  ];

  for (const { name: deviceName, device } of mobileViewports) {
    test(`should render audio player at bottom on ${deviceName}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
      });
      const page = await context.newPage();

      // Navigate to an article page
      // Note: Using a test article or mock if needed
      await page.goto('http://localhost:3000');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Look for a news article link and click it
      const newsLink = page.locator('a').first();
      if (await newsLink.isVisible()) {
        await newsLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Find and click the listen button
      const listenButton = page.locator('[aria-label*="Listen"]').first();
      if (await listenButton.isVisible()) {
        await listenButton.click();

        // Wait for audio player to appear
        await page.waitForTimeout(500);

        // Get the audio player region
        const audioPlayer = page.locator('[role="region"][aria-label*="Article audio player"]');

        // Verify it exists
        await expect(audioPlayer).toBeVisible();

        // Get the bounding box
        const bbox = await audioPlayer.boundingBox();

        if (bbox) {
          console.log(`${deviceName} - Audio player position:`, {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            bottom: bbox.y + bbox.height,
          });

          // Get viewport height
          const viewportSize = page.viewportSize();

          if (viewportSize) {
            const playerBottom = bbox.y + bbox.height;
            const viewportHeight = viewportSize.height;
            const distanceFromBottom = viewportHeight - playerBottom;

            console.log(`${deviceName} - Distance from bottom: ${distanceFromBottom}px (viewport height: ${viewportHeight}px)`);

            // Verify player is near the bottom (within 20px of bottom)
            // and not overlapping critical OS UI areas
            expect(distanceFromBottom).toBeLessThanOrEqual(20);

            // Player should not be at top
            expect(bbox.y).toBeGreaterThan(50);

            // Take a screenshot for visual inspection
            await page.screenshot({
              path: `./e2e/screenshots/article-listen-${deviceName.replace(/\s+/g, '-').toLowerCase()}.png`,
              fullPage: true
            });
          }
        }
      }

      await context.close();
    });
  }

  test('player should not overlap with system UI during scroll', async ({ browser }) => {
    const context = await browser.newContext(devices['iPhone 12']);
    const page = await context.newPage();

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const newsLink = page.locator('a').first();
    if (await newsLink.isVisible()) {
      await newsLink.click();
      await page.waitForLoadState('networkidle');
    }

    const listenButton = page.locator('[aria-label*="Listen"]').first();
    if (await listenButton.isVisible()) {
      await listenButton.click();
      await page.waitForTimeout(500);

      // Scroll through the article
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(300);

      const audioPlayer = page.locator('[role="region"][aria-label*="Article audio player"]');

      // Player should still be visible and in correct position
      await expect(audioPlayer).toBeVisible();

      const bbox = await audioPlayer.boundingBox();
      const viewportSize = page.viewportSize();

      if (bbox && viewportSize) {
        const playerBottom = bbox.y + bbox.height;
        const distanceFromBottom = viewportSize.height - playerBottom;

        // Should still be near bottom during scroll
        expect(distanceFromBottom).toBeLessThanOrEqual(20);
      }

      await page.screenshot({
        path: './e2e/screenshots/article-listen-scroll-test.png',
        fullPage: false
      });
    }

    await context.close();
  });
});
