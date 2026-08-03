import { test } from '@playwright/test';

test.setTimeout(30000);

test('check local OG metadata', async ({ page }) => {
  const articleUrl = 'http://localhost:3000/news/1548072/ajinkya-rahane-announces-retirement-from-international-cricket';

  const response = await page.goto(articleUrl, { waitUntil: 'networkidle' });
  const html = await page.content();

  console.log('\n========== LOCAL OG METADATA CHECK ==========\n');
  console.log('Response status:', response?.status());

  // Extract meta tags from HTML
  const metaRegex = /<meta\s+(?:name|property)="([^"]*)"\s+content="([^"]*)"/g;
  let match;
  const metadata: Record<string, string> = {};

  while ((match = metaRegex.exec(html)) !== null) {
    metadata[match[1]] = match[2];
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

  console.log('\nBasic Tags:');
  console.log('  title:', metadata['title'] || '❌ MISSING');
  console.log('  description:', metadata['description'] || '❌ MISSING');

  // Check for canonical
  const canonicalMatch = html.match(/rel="canonical"\s+href="([^"]*)"/);
  console.log('  canonical:', canonicalMatch?.[1] || '❌ MISSING');

  // Validate
  if (metadata['og:image'] && metadata['og:image'].startsWith('http')) {
    console.log('\n✅ OG image is valid absolute URL');
  } else if (metadata['og:image']) {
    console.log('\n⚠️ OG image exists but might be relative:', metadata['og:image'].substring(0, 80));
  }
});
