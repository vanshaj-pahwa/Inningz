import { chromium } from 'playwright';

const URL = 'https://inningz.vercel.app/news/1547061/zimbabwe-look-to-expose-vulnerable-india-searching-for-winning-formula';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', e => console.log('[pageerror]', e.message));
    page.on('console', msg => { if (msg.type() === 'error') console.log('[console.error]', msg.text().slice(0, 200)); });

    console.log('goto', URL);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('h1', { timeout: 30000 });
    await page.waitForTimeout(15000);

    const dump = await page.evaluate(() => {
        const items = [];
        const main = document.querySelector('main') || document.body;
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.tagName === 'H1') items.push({ t: 'H1', text: (node.textContent || '').slice(0, 80) });
            if (node.tagName === 'H2') items.push({ t: 'H2', text: (node.textContent || '').slice(0, 80) });
            if (node.tagName === 'FIGURE') {
                const img = node.querySelector('img');
                const cap = node.querySelector('figcaption');
                items.push({ t: 'FIG', src: (img?.getAttribute('src') || '').slice(-60), caption: (cap?.textContent || '').slice(0, 70) });
            }
            if (node.tagName === 'P') {
                const t = (node.textContent || '').trim();
                if (t.length > 40 && t.length < 300) items.push({ t: 'P', text: t.slice(0, 90), b: node.querySelector('b, strong') !== null });
            }
        }
        return items;
    });
    console.log(`\ncounts: H2=${dump.filter(i => i.t === 'H2').length} FIG=${dump.filter(i => i.t === 'FIG').length} P=${dump.filter(i => i.t === 'P').length}`);
    for (const item of dump) console.log(' ', JSON.stringify(item));

    await page.screenshot({ path: 'C:/Users/vansh/AppData/Local/Temp/claude/c--Users-vansh-Documents-Inningz/59ba2036-6896-4e89-8d82-8fcf71ddbf37/scratchpad/vercel-now.png', fullPage: true });
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
