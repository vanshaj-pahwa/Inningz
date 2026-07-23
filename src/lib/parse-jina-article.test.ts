import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseJinaArticle } from './parse-jina-article';

const FIXTURE_1 = `Title: Afghanistan to host India for T20I series in Delhi

URL Source: https://www.espncricinfo.com/story/afghanistan-to-host-india-for-t20i-series-in-delhi-1547225

Published Time: 2026-07-23T11:42:00Z

Markdown Content:
[![Image 1: Cricinfo](https://wassets.hscicdn.com/static/images/v2/logo.svg)](https://www.espncricinfo.com/)

[Live Scores](https://www.espncricinfo.com/live-cricket-score "Live Cricket Score")

# Afghanistan to host India for T20I series in Delhi

This will be the first time a team will host India on Indian soil

[![Image 22: Daya Sagar](https://img1.hscicdn.com/image/upload/f_auto,t_h_100/lsci/db/PICTURES/CMS/386900/386939.jpg)](https://www.espncricinfo.com/author/daya-sagar-767)

[Daya Sagar](https://www.espncricinfo.com/author/daya-sagar-767 "Daya Sagar")

Published: Jul 23, 2026, 11:42 AM (23 mins ago)

1

![Image 23: Rahmanullah Gurbaz reached his fifty in 29 balls](https://img1.hscicdn.com/image/upload/f_auto,t_ds_wide_w_1280,q_70/lsci/db/PICTURES/CMS/374100/374175.6.jpg)

Afghanistan have never beaten India in T20Is•BCCI

[Afghanistan](https://www.espncricinfo.com/team/afghanistan-40) are set to host [India](https://www.espncricinfo.com/team/india-6) for a three-match T20I series in Delhi in September. Cricinfo has learned the series is likely to be played at the Arun Jaitley Stadium on September 13, 15 and 17, but the fixtures have not been officially announced.

This will be the first time a team will host India on Indian soil as Afghanistan have been playing their home matches in India for a while. They have played home games in Lucknow, Dehradun and Greater Noida, but never against India.

For India, the series is scheduled between the Test tour of Sri Lanka and the Asian Games, which starts late September in Japan.

Afghanistan haven't played any T20Is since the T20 World Cup earlier this year in India where they won two of their four games and missed out on a Super Eight spot.

[Afghanistan](https://www.espncricinfo.com/team/afghanistan-40)[India](https://www.espncricinfo.com/team/india-6)

1

दया सागर Cricinfo हिंदी में सब एडिटर हैं।dayasagar95

[Terms of Use](https://www.cricinfo.com/terms-of-use "Terms of Use")•[Privacy Policy](https://www.cricinfo.com/privacy-notice "Privacy Policy")
`;

test('parseJinaArticle: extracts body paragraphs from typical article', () => {
    const parsed = parseJinaArticle(FIXTURE_1);
    assert.ok(parsed.paragraphs.length >= 3, `expected >=3 paragraphs, got ${parsed.paragraphs.length}`);
    // First body paragraph
    assert.match(parsed.paragraphs[0], /Afghanistan are set to host India for a three-match T20I series/);
    assert.match(parsed.paragraphs[0], /Arun Jaitley Stadium/);
    // Link markdown is stripped
    assert.doesNotMatch(parsed.paragraphs[0], /\[Afghanistan\]/);
    // Last body paragraph
    assert.match(parsed.paragraphs.at(-1)!, /Super Eight spot/);
    // Tag block, byline, comment count, Hindi bio, Terms of Use — all excluded
    for (const p of parsed.paragraphs) {
        assert.ok(!p.includes('Terms of Use'));
        assert.ok(!p.startsWith('Published:'));
        assert.ok(!/^\d+$/.test(p));
    }
});

test('parseJinaArticle: extracts hero image + caption', () => {
    const parsed = parseJinaArticle(FIXTURE_1);
    assert.match(parsed.heroImageUrl || '', /img1\.hscicdn\.com/);
    assert.match(parsed.heroImageCaption || '', /Afghanistan have never beaten India in T20Is/);
});

test('parseJinaArticle: no byline anchor -> empty', () => {
    const parsed = parseJinaArticle('# Title\n\nA paragraph.\n');
    assert.strictEqual(parsed.paragraphs.length, 0);
});

test('parseJinaArticle: parses live Jina fetch for article 1547225', async () => {
    const url = 'https://r.jina.ai/https://www.espncricinfo.com/story/afghanistan-to-host-india-for-t20i-series-in-delhi-1547225';
    const md = await fetch(url).then(r => r.ok ? r.text() : '');
    if (!md) {
        console.log('  (skipping live test: Jina unreachable)');
        return;
    }
    const parsed = parseJinaArticle(md);
    console.log(`  live: ${parsed.paragraphs.length} paragraphs, hero=${parsed.heroImageUrl ? 'yes' : 'no'}`);
    assert.ok(parsed.paragraphs.length >= 2, `expected >=2 paragraphs, got ${parsed.paragraphs.length}`);
    assert.match(parsed.paragraphs[0], /Afghanistan/);
});
