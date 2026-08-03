import { test } from '@playwright/test';

test.setTimeout(15000);

test('check if site is deployed', async ({ page }) => {
  console.log('\n========== SITE STATUS CHECK ==========\n');

  const urls = [
    'https://inningz.vercel.app/',
    'https://inningz.vercel.app/news',
    'https://inningz.vercel.app/news/1548072/ajinkya-rahane-announces-retirement-from-international-cricket',
  ];

  for (const url of urls) {
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const html = await page.content();
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || 'No title';
      console.log(`✅ ${url}`);
      console.log(`   Status: ${response?.status()}`);
      console.log(`   Title: ${title}`);
    } catch (e) {
      console.log(`❌ ${url}`);
      console.log(`   Error: ${(e as Error).message}`);
    }
  }
});
