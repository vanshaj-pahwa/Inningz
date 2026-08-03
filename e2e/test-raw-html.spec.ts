import { test } from '@playwright/test';

test.setTimeout(30000);

test('check raw HTML for meta tags', async ({ page }) => {
  const articleUrl = 'https://inningz.vercel.app/news/1548072/ajinkya-rahane-announces-retirement-from-international-cricket';

  const response = await page.goto(articleUrl, { waitUntil: 'networkidle' });
  const html = await page.content();

  console.log('\n========== RAW HTML CHECK ==========\n');

  // Check if og: tags exist anywhere
  const ogCount = (html.match(/property="og:/g) || []).length;
  const twitterCount = (html.match(/property="twitter:/g) || []).length;

  console.log('og: tags in HTML:', ogCount);
  console.log('twitter: tags in HTML:', twitterCount);

  // Find all meta tags in head
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/);
  if (headMatch) {
    const headContent = headMatch[1];
    const metaTags = headContent.match(/<meta[^>]*>/g) || [];
    console.log('\nTotal meta tags:', metaTags.length);

    // Show first 10 meta tags
    console.log('\nFirst meta tags:');
    metaTags.slice(0, 10).forEach((tag, i) => {
      console.log(`  ${i + 1}. ${tag.substring(0, 100)}`);
    });

    // Look for og or twitter tags
    const socialTags = metaTags.filter(tag => tag.includes('og:') || tag.includes('twitter:'));
    console.log('\nSocial meta tags found:', socialTags.length);
    socialTags.forEach(tag => {
      console.log(`  ${tag.substring(0, 120)}`);
    });
  }

  console.log('\n========== TITLE AND DESCRIPTION ==========\n');
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const descMatch = html.match(/name="description"\s+content="([^"]*)"/);

  console.log('Page title:', titleMatch?.[1] || '❌ NOT FOUND');
  console.log('Meta description:', descMatch?.[1] || '❌ NOT FOUND');
});
