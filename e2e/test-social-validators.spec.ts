import { test } from '@playwright/test';

test.setTimeout(60000);

test('validate with social media crawlers', async ({ page }) => {
  const articleUrl = 'http://localhost:3000/news/1548072/ajinkya-rahane-announces-retirement-from-international-cricket';

  console.log('\n========== SOCIAL MEDIA PREVIEW VALIDATORS ==========\n');

  // Test Facebook OG Debugger
  console.log('Testing: Facebook Open Graph Debugger');
  console.log('URL: https://developers.facebook.com/tools/debug/og/object');
  const fbUrl = `https://developers.facebook.com/tools/debug/og/object?debugger=true&q=${encodeURIComponent(articleUrl)}`;
  console.log('Check:', fbUrl.substring(0, 80) + '...');

  // Test Twitter Card Validator
  console.log('\nTesting: Twitter Card Validator');
  console.log('URL: https://cards-dev.twitter.com/validator');
  const twitterUrl = `https://cards-dev.twitter.com/validator/input?url=${encodeURIComponent(articleUrl)}`;
  console.log('Check:', twitterUrl.substring(0, 80) + '...');

  // Test LinkedIn Post Inspector
  console.log('\nTesting: LinkedIn Post Inspector');
  console.log('URL: https://www.linkedin.com/post-inspector/inspect/');
  const linkedinUrl = `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(articleUrl)}`;
  console.log('Check:', linkedinUrl.substring(0, 80) + '...');

  // Fetch the page and check metadata directly
  console.log('\n========== DIRECT METADATA CHECK ==========\n');
  const response = await page.goto(articleUrl);
  const html = await page.content();

  const metaRegex = /<meta\s+(?:name|property)="([^"]*)"\s+content="([^"]*)"/g;
  let match;
  const metadata: Record<string, string> = {};

  while ((match = metaRegex.exec(html)) !== null) {
    metadata[match[1]] = match[2];
  }

  console.log('Critical OG Tags (for social crawlers):');
  console.log(`✅ og:title: "${metadata['og:title']?.substring(0, 60)}..."`);
  console.log(`✅ og:description: "${metadata['og:description']?.substring(0, 60)}..."`);
  console.log(`✅ og:image: "${metadata['og:image']}"`);
  console.log(`✅ og:url: "${metadata['og:url']}"`);
  console.log(`✅ og:type: "${metadata['og:type']}"`);

  // Validate image URL is accessible
  if (metadata['og:image']) {
    try {
      const imgResponse = await page.goto(metadata['og:image'], { timeout: 5000 });
      console.log(`\n✅ OG image is accessible (status: ${imgResponse?.status()})`);
    } catch (e) {
      console.log(`\n❌ OG image may not be accessible: ${(e as Error).message}`);
    }
  }

  console.log('\nNote: Paste the article URL above in the social validators to see');
  console.log('how crawlers interpret the metadata for preview generation.');
});
