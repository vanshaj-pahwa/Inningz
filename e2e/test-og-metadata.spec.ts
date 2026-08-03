import { test } from '@playwright/test';

test.setTimeout(30000);

test('verify OG metadata on article page', async ({ page }) => {
  const articleUrl = 'https://inningz.vercel.app/news/1548072/ajinkya-rahane-announces-retirement-from-international-cricket';

  await page.goto(articleUrl, { waitUntil: 'networkidle' });

  console.log('\n========== OG METADATA CHECK ==========\n');

  // Get all meta tags
  const metaTags = await page.locator('meta').all();

  const metadata: Record<string, string> = {};
  for (const tag of metaTags) {
    const property = await tag.getAttribute('property');
    const name = await tag.getAttribute('name');
    const content = await tag.getAttribute('content');

    if (property && content) metadata[property] = content;
    if (name && content && (name.startsWith('og:') || name.startsWith('twitter:'))) {
      metadata[name] = content;
    }
  }

  console.log('Open Graph Tags:');
  console.log('  og:title:', metadata['og:title'] || '❌ MISSING');
  console.log('  og:description:', metadata['og:description'] || '❌ MISSING');
  console.log('  og:image:', metadata['og:image'] || '❌ MISSING');
  console.log('  og:url:', metadata['og:url'] || '❌ MISSING');
  console.log('  og:type:', metadata['og:type'] || '❌ MISSING');
  console.log('  og:site_name:', metadata['og:site_name'] || '❌ MISSING');

  console.log('\nTwitter Card Tags:');
  console.log('  twitter:card:', metadata['twitter:card'] || '❌ MISSING');
  console.log('  twitter:title:', metadata['twitter:title'] || '❌ MISSING');
  console.log('  twitter:description:', metadata['twitter:description'] || '❌ MISSING');
  console.log('  twitter:image:', metadata['twitter:image'] || '❌ MISSING');

  console.log('\nOther Tags:');
  console.log('  canonical:', metadata['canonical'] || await page.locator('link[rel="canonical"]').getAttribute('href') || '❌ MISSING');
  console.log('  description:', metadata['description'] || '❌ MISSING');

  // Validate image URL is properly formatted
  if (metadata['og:image']) {
    const imgUrl = metadata['og:image'];
    if (imgUrl.startsWith('http')) {
      console.log('\n✅ OG image is absolute URL:', imgUrl.substring(0, 80) + '...');
    } else {
      console.log('\n❌ OG image is not absolute:', imgUrl);
    }
  }

  // Log raw HTML head for debugging
  const headHtml = await page.locator('head').innerHTML();
  const ogLines = headHtml.split('\n').filter(line => line.includes('og:') || line.includes('twitter:'));
  console.log('\nRaw meta tags with og: or twitter:');
  ogLines.forEach(line => console.log(line.trim().substring(0, 120)));
});
