import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ARTICLES = [
    {
        label: 'preview',
        path: '/news/1547061/zimbabwe-look-to-expose-vulnerable-india-searching-for-winning-formula',
        headings: ['Big picture', 'Form guide', 'In the spotlight', 'Team news', 'Pitch and conditions', 'Stats and trivia'],
        imagePairs: [
            { src: /419689\.4\.jpg/, caption: /Tilak Varma struck a half-century/, notCaption: /Newman Nyamhuri/ },
            { src: /374823\.4\.jpg/, caption: /Newman Nyamhuri is set to return/, notCaption: /Tilak Varma struck/ },
        ],
    },
    {
        label: 'byline',
        path: '/news/1547225/afghanistan-to-host-india-for-t20i-series-in-delhi',
        headings: [],
        imagePairs: [],
        bodyText: /Arun Jaitley Stadium/,
    },
];

const results = [];
function record(name, pass, details = '') {
    results.push({ name, pass, details });
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${details ? ' — ' + details : ''}`);
}

async function testArticle(browser, article, viewport, viewportLabel) {
    console.log(`\n=== ${article.label} @ ${viewportLabel} (${viewport.width}x${viewport.height}) ===`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', e.message));
    try {
        await page.goto(BASE + article.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('h1', { timeout: 30000 });
        await page.waitForFunction(() => {
            const ps = document.querySelectorAll('main p, article p');
            return Array.from(ps).some(p => (p.textContent || '').trim().length > 100);
        }, null, { timeout: 60000 });
        // Give enrichment plenty of time.
        await page.waitForTimeout(6000);

        if (article.headings.length > 0) {
            const headingsSeen = await page.$$eval('main h2, article h2', els => els.map(el => (el.textContent || '').trim()));
            for (const h of article.headings) {
                record(`${article.label}/${viewportLabel}: heading "${h}"`,
                    headingsSeen.some(x => x.includes(h)),
                    `seen count=${headingsSeen.length}`,
                );
            }
        }

        if (article.imagePairs.length > 0) {
            const figures = await page.$$eval('main figure, article figure', figs => figs.map(f => ({
                src: (f.querySelector('img')?.getAttribute('src') || ''),
                caption: (f.querySelector('figcaption')?.textContent || '').trim(),
            })));
            // Hero caption must NOT be a body-image caption.
            const heroCaption = figures[0]?.caption || '';
            record(
                `${article.label}/${viewportLabel}: hero caption is not a body-image caption`,
                !/Tilak Varma struck a half-century/.test(heroCaption) && !/Newman Nyamhuri/.test(heroCaption),
                `heroCaption="${heroCaption.slice(0, 80)}"`,
            );
            for (const pair of article.imagePairs) {
                const match = figures.find(f => pair.src.test(f.src));
                const captionMatch = match && pair.caption.test(match.caption);
                const captionNotMisassigned = match && !pair.notCaption.test(match.caption);
                record(
                    `${article.label}/${viewportLabel}: ${pair.src.source} → ${pair.caption.source}`,
                    captionMatch && captionNotMisassigned,
                    match ? `src…${match.src.slice(-30)} caption="${match.caption.slice(0, 60)}"` : 'no matching figure',
                );
            }
        }

        if (article.bodyText) {
            const bodyOk = await page.evaluate(re => new RegExp(re).test(document.body.innerText), article.bodyText.source);
            record(`${article.label}/${viewportLabel}: body contains ${article.bodyText}`, bodyOk);
        }
    } catch (e) {
        console.log(`  [ERROR] ${e.message}`);
        record(`${article.label}/${viewportLabel}: runtime`, false, e.message);
    } finally {
        await context.close();
    }
}

(async () => {
    const browser = await chromium.launch();
    try {
        for (const a of ARTICLES) {
            await testArticle(browser, a, { width: 1440, height: 900 }, 'desktop');
            await testArticle(browser, a, { width: 390, height: 844 }, 'mobile');
        }
    } finally {
        await browser.close();
    }

    console.log('\n=== summary ===');
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`  ${passed} passed, ${failed} failed`);
    for (const r of results.filter(x => !x.pass)) console.log(`  FAIL: ${r.name} — ${r.details}`);
    process.exit(failed ? 1 : 0);
})();
