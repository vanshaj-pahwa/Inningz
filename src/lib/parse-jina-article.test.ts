import { test } from 'node:test';
import assert from 'node:assert';
import { parseJinaArticle } from './parse-jina-article';

const FIXTURE_BYLINE = `Title: Afghanistan to host India for T20I series in Delhi

URL Source: https://www.espncricinfo.com/story/afghanistan-to-host-india-for-t20i-series-in-delhi-1547225

Markdown Content:
[![Image 1: Cricinfo](https://wassets.hscicdn.com/static/images/v2/logo.svg)](https://www.espncricinfo.com/)

# Afghanistan to host India for T20I series in Delhi

[![Image 22: Daya Sagar](https://img1.hscicdn.com/image/upload/f_auto,t_h_100/lsci/db/PICTURES/CMS/386900/386939.jpg)](https://www.espncricinfo.com/author/daya-sagar-767)

[Daya Sagar](https://www.espncricinfo.com/author/daya-sagar-767 "Daya Sagar")

Published: Jul 23, 2026, 11:42 AM (23 mins ago)

1

![Image 23: Rahmanullah Gurbaz reached his fifty in 29 balls](https://img1.hscicdn.com/image/upload/f_auto,t_ds_wide_w_1280,q_70/lsci/db/PICTURES/CMS/374100/374175.6.jpg)

Afghanistan have never beaten India in T20Is•BCCI

[Afghanistan](https://www.espncricinfo.com/team/afghanistan-40) are set to host [India](https://www.espncricinfo.com/team/india-6) for a three-match T20I series in Delhi in September. Cricinfo has learned the series is likely to be played at the Arun Jaitley Stadium on September 13, 15 and 17, but the fixtures have not been officially announced.

This will be the first time a team will host India on Indian soil as Afghanistan have been playing their home matches in India for a while.

![Image 24: Second inline image caption](https://img1.hscicdn.com/image/second-inline.jpg)

Afghanistan haven't played any T20Is since the T20 World Cup earlier this year.

[Afghanistan](https://www.espncricinfo.com/team/afghanistan-40)[India](https://www.espncricinfo.com/team/india-6)

[Terms of Use](https://www.cricinfo.com/terms-of-use "Terms of Use")
`;

const FIXTURE_PREVIEW = `Title: Zimbabwe look to expose vulnerable India

URL Source: https://www.espncricinfo.com/story/zimbabwe-look-to-expose-vulnerable-india-searching-for-winning-formula-1547061

Markdown Content:
## Big picture: Shreyas Iyer looking for first win

[India](https://www.espncricinfo.com/team/india-6)'s role in helping smaller cricket economies generate income via TV rights generally dominates chatter ahead of a [Zimbabwe](https://www.espncricinfo.com/team/zimbabwe-9) tour. But series defeats to Ireland and England have veered the discussion towards India's T20I failings and team combinations.

When they arrived in Zimbabwe two years ago, they were led by Shubman Gill. Now, T20Is are the only format Gill isn't part of.

Related

*   [![Image 1: alt](https://wassets.hscicdn.com/static/images/lazyimage-noaspect.svg) Bishnoi replaces injured Varun in squad for Zimbabwe T20I tour](https://www.espncricinfo.com/story/related-1)
*   [![Image 2: alt](https://wassets.hscicdn.com/static/images/lazyimage-noaspect.svg) Sooryavanshi, Rinku, India's pace stocks in focus](https://www.espncricinfo.com/story/related-2)

Having made it to the Super Eight at the T20 World Cup earlier this year, Zimbabwe built on that success to beat Bangladesh in the one-off Test and the ODI series.

## Form guide

**Zimbabwe** LLWLL (last five completed T20Is, most recent first)

**India** LLLLL

## In the spotlight

**[Tilak Varma](https://www.espncricinfo.com/cricketers/tilak-varma-1170265)** struck a quick-fire half-century in the fifth T20I against England, but questions continue to be asked of his strike rate in the middle overs, particularly against spin.

## Stats and trivia

*    Each of Zimbabwe's three T20I wins against India has come at the Harare Sports Club.
*    Raza is the only Zimbabwean to be part of those three wins.
*    India's 234 for 2 on their previous tour is the highest team total.

[Zimbabwe](https://www.espncricinfo.com/team/zimbabwe-9)[India](https://www.espncricinfo.com/team/india-6)
`;

test('byline pattern: extracts body paragraphs, hero image, and inline image blocks', () => {
    const parsed = parseJinaArticle(FIXTURE_BYLINE);
    assert.ok(parsed.paragraphs.length >= 3, `paragraphs=${parsed.paragraphs.length}`);
    assert.match(parsed.paragraphs[0], /Afghanistan are set to host India for a three-match T20I series/);
    assert.doesNotMatch(parsed.paragraphs[0], /\[Afghanistan\]/);
    // Hero image comes from the FIRST inline image (post-byline).
    assert.strictEqual(parsed.heroImageUrl, 'https://img1.hscicdn.com/image/upload/f_auto,t_ds_wide_w_1280,q_70/lsci/db/PICTURES/CMS/374100/374175.6.jpg');
    // Byline flow captures the caption LINE (which follows the image), not the alt text.
    assert.match(parsed.heroImageCaption || '', /Afghanistan have never beaten India/);
    // Second inline image becomes an image BLOCK, not a duplicate hero.
    const imageBlocks = parsed.blocks.filter(b => b.type === 'image');
    assert.strictEqual(imageBlocks.length, 1);
    assert.strictEqual((imageBlocks[0] as { imageUrl: string }).imageUrl, 'https://img1.hscicdn.com/image/second-inline.jpg');
});

test('preview pattern: extracts headings and paragraphs when no byline exists', () => {
    const parsed = parseJinaArticle(FIXTURE_PREVIEW);

    const headings = parsed.blocks.filter(b => b.type === 'heading') as Array<{ text: string }>;
    const headingTexts = headings.map(h => h.text);
    assert.deepStrictEqual(headingTexts, [
        'Big picture: Shreyas Iyer looking for first win',
        'Form guide',
        'In the spotlight',
        'Stats and trivia',
    ]);

    // First body paragraph after the first heading
    assert.match(parsed.paragraphs[0], /India's role in helping smaller cricket economies/);

    // "Related" list items must be skipped
    for (const p of parsed.paragraphs) {
        assert.ok(!/Bishnoi replaces injured Varun/.test(p), `related item leaked: ${p}`);
        assert.ok(!/pace stocks in focus/.test(p), `related item leaked: ${p}`);
    }

    // Bold formatting preserved as <b>
    const paraBlocks = parsed.blocks.filter(b => b.type === 'paragraph') as Array<{ html: string }>;
    const hasBoldZim = paraBlocks.some(b => /<b>Zimbabwe<\/b>/.test(b.html));
    const hasBoldTilak = paraBlocks.some(b => /<b>Tilak Varma<\/b>/.test(b.html));
    assert.ok(hasBoldZim, 'expected <b>Zimbabwe</b> in a paragraph block');
    assert.ok(hasBoldTilak, 'expected <b>Tilak Varma</b> in a paragraph block');

    // Stats and trivia items rendered as a <ul>
    const hasList = paraBlocks.some(b => /<ul>/.test(b.html) && /Harare Sports Club/.test(b.html));
    assert.ok(hasList, 'expected a <ul> containing "Harare Sports Club"');
});

test('no anchor -> empty', () => {
    const parsed = parseJinaArticle('# Title\n\nA paragraph.\n');
    assert.strictEqual(parsed.paragraphs.length, 0);
    assert.strictEqual(parsed.blocks.length, 0);
});

test('live: preview article 1547061 (Zimbabwe preview, no byline)', async () => {
    const url = 'https://r.jina.ai/https://www.espncricinfo.com/story/zimbabwe-look-to-expose-vulnerable-india-searching-for-winning-formula-1547061';
    const md = await fetch(url).then(r => r.ok ? r.text() : '');
    if (!md) {
        console.log('  (skipping live test: Jina unreachable)');
        return;
    }
    const parsed = parseJinaArticle(md);
    console.log(`  live-preview: ${parsed.paragraphs.length} paragraphs, ${parsed.blocks.filter(b => b.type === 'heading').length} headings`);
    assert.ok(parsed.paragraphs.length >= 5, `expected >=5 paragraphs, got ${parsed.paragraphs.length}`);
    assert.ok(parsed.blocks.filter(b => b.type === 'heading').length >= 3, 'expected >=3 section headings');
});

test('live: byline article 1547225 (Afghanistan story, has byline + hero)', async () => {
    const url = 'https://r.jina.ai/https://www.espncricinfo.com/story/afghanistan-to-host-india-for-t20i-series-in-delhi-1547225';
    const md = await fetch(url).then(r => r.ok ? r.text() : '');
    if (!md) {
        console.log('  (skipping live test: Jina unreachable)');
        return;
    }
    const parsed = parseJinaArticle(md);
    console.log(`  live-byline: ${parsed.paragraphs.length} paragraphs, hero=${parsed.heroImageUrl ? 'yes' : 'no'}`);
    assert.ok(parsed.paragraphs.length >= 2, `expected >=2 paragraphs`);
    assert.match(parsed.paragraphs[0], /Afghanistan/);
});
