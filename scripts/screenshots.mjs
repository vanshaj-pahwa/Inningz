import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const BASE = (process.env.INNINGZ_URL || 'https://inningz.vercel.app').replace(/\/$/, '');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'screenshots');
const log = (...a) => console.log('[screenshots]', ...a);

// Curated match IDs — swap as matches finish. 129574 is a Test (England v NZ)
// so the Report tab shows Win-Probability with a Draw line.
const MATCHES = {
    test: '129574',
    t20League: '150745', // Major League Cricket 2026 (USA T20 league)
    t20i: '150986',      // Ireland v India T20I
};

const IPL_SERIES = '9241/indian-premier-league-2026';

async function main() {
    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: 'dark',
    });
    const page = await ctx.newPage();

    const go = (path) => page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => page.goto(BASE + path, { waitUntil: 'load', timeout: 90_000 }));
    const shot = async (name, opts = {}) => {
        const target = opts.locator ?? page;
        await target.screenshot({ path: join(OUT, name), fullPage: opts.fullPage ?? false });
        log(name);
    };
    const waitForContent = (ms = 3500) => page.waitForTimeout(ms);

    const waitForImages = async (p = page) => {
        await p.evaluate(async () => {
            const imgs = Array.from(document.images);
            await Promise.all(imgs.map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise(resolve => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                    setTimeout(resolve, 8000);
                });
            }));
        });
    };

    // Scroll top→bottom→top in steps so every IntersectionObserver section
    // (Report tab, Scorecard innings, Squads, Series detail, etc.) actually
    // starts fetching before we screenshot. Then wait for images + networkidle.
    const autoScrollAndSettle = async (p = page, settleMs = 6000) => {
        await p.evaluate(async () => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const step = Math.max(400, Math.floor(window.innerHeight * 0.7));
            let y = 0;
            const max = document.body.scrollHeight;
            while (y < max) {
                window.scrollTo(0, y);
                await sleep(700);
                y += step;
            }
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(1500);
            window.scrollTo(0, 0);
            await sleep(500);
        });
        await p.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => { });
        await waitForImages(p);
        await p.waitForTimeout(settleMs);
    };

    // ─ Home ─────────────────────────────────────────────────────────────
    try {
        await go('/');
        await waitForContent(4500);
        await autoScrollAndSettle(page, 4000);
        await shot('home.png', { fullPage: true });
    } catch (e) { log('home failed:', e.message); }

    // ─ Live tab ─────────────────────────────────────────────────────────
    try {
        await go('/?tab=live');
        await waitForContent(4000);
        await autoScrollAndSettle(page, 3000);
        await shot('live.png');
    } catch (e) { log('live failed:', e.message); }

    // ─ Recent tab ───────────────────────────────────────────────────────
    try {
        await go('/?tab=recent');
        await waitForContent(4000);
        await autoScrollAndSettle(page, 3000);
        await shot('recent.png');
    } catch (e) { log('recent failed:', e.message); }

    // ─ Upcoming tab ─────────────────────────────────────────────────────
    try {
        await go('/?tab=upcoming');
        await waitForContent(4000);
        await autoScrollAndSettle(page, 3000);
        await shot('upcoming.png');
    } catch (e) { log('upcoming failed:', e.message); }

    // ─ Series tab ───────────────────────────────────────────────────────
    try {
        await go('/?tab=series');
        await waitForContent(4500);
        await autoScrollAndSettle(page, 4000);
        await shot('series.png');
    } catch (e) { log('series failed:', e.message); }

    // ─ ICC Rankings ─────────────────────────────────────────────────────
    try {
        await go('/rankings');
        await waitForContent(4500);
        await autoScrollAndSettle(page, 4000);
        await shot('rankings.png');
    } catch (e) { log('rankings failed:', e.message); }

    // ─ Match: Live tab (Test match) ─────────────────────────────────────
    try {
        await go(`/match/${MATCHES.test}`);
        await waitForContent(5000);
        await autoScrollAndSettle(page, 5000);
        await shot('match-live.png', { fullPage: true });
    } catch (e) { log('match-live failed:', e.message); }

    // ─ Match: Scorecard tab ─────────────────────────────────────────────
    try {
        await page.locator('button:has-text("Scorecard")').first().click();
        await waitForContent(3500);
        await autoScrollAndSettle(page, 5000);
        await shot('match-scorecard.png', { fullPage: true });
    } catch (e) { log('match-scorecard failed:', e.message); }

    // ─ Match: Report tab — capture each chart section individually ─────
    try {
        await page.locator('button:has-text("Report")').first().click();
        await waitForContent(5000);
        // Walk through, scrolling each section into view so its
        // IntersectionObserver fires and its chart actually loads, then snap.
        const reportSections = [
            { id: 'winProb', file: 'report-win-prob.png' },
            { id: 'runRate', file: 'report-run-rate.png' },
            { id: 'worm', file: 'report-worm.png' },
            { id: 'overs', file: 'report-overs.png' },
            { id: 'partnerships', file: 'report-partnerships.png' },
        ];
        for (const { id, file } of reportSections) {
            try {
                const section = page.locator(`[data-section="${id}"]`).first();
                await section.scrollIntoViewIfNeeded({ timeout: 10_000 });
                await page.waitForTimeout(4500);
                await waitForImages(page);
                await page.waitForTimeout(1500);
                await section.screenshot({ path: join(OUT, file) });
                log(file);
            } catch (e) { log(`${file} failed:`, e.message); }
        }
    } catch (e) { log('match-report failed:', e.message); }

    // ─ Match: Squads tab ────────────────────────────────────────────────
    try {
        await page.locator('button:has-text("Squads")').first().click();
        await waitForContent(3500);
        await autoScrollAndSettle(page, 5000);
        await shot('match-squads.png', { fullPage: true });
    } catch (e) { log('match-squads failed:', e.message); }

    // ─ T20 league match (Major League Cricket) ─────────────────────────
    try {
        await go(`/match/${MATCHES.t20League}`);
        await waitForContent(5000);
        await autoScrollAndSettle(page, 5000);
        await shot('match-t20.png', { fullPage: true });
    } catch (e) { log('match-t20 failed:', e.message); }

    // ─ Matchups from a T20I match (Test matches don't have matchups data) ─
    try {
        await go(`/match/${MATCHES.t20i}`);
        await waitForContent(5000);
        await page.locator('button:has-text("Report")').first().click();
        await waitForContent(5000);
        const matchups = page.locator('[data-section="matchups"]').first();
        await matchups.scrollIntoViewIfNeeded({ timeout: 20_000 });
        await waitForContent(6000);
        await waitForImages(page);
        await waitForContent(1500);
        await matchups.screenshot({ path: join(OUT, 'report-matchups.png') });
        log('report-matchups.png');
    } catch (e) { log('report-matchups failed:', e.message); }

    // ─ Points Table ─────────────────────────────────────────────────────
    try {
        await go(`/series/${IPL_SERIES}?view=points`);
        await waitForContent(5000);
        await autoScrollAndSettle(page, 5000);
        await shot('points-table.png', { fullPage: true });
    } catch (e) { log('points-table failed:', e.message); }

    // ─ Mobile home (iPhone-ish viewport) ────────────────────────────────
    try {
        const mob = await browser.newContext({
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 2,
            colorScheme: 'dark',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        });
        const mp = await mob.newPage();
        await mp.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => mp.goto(BASE + '/', { waitUntil: 'load', timeout: 90_000 }));
        await mp.waitForTimeout(4500);
        // Reuse the same scroll helper for mobile too
        await mp.evaluate(async () => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            const step = Math.max(400, Math.floor(window.innerHeight * 0.7));
            let y = 0;
            const max = document.body.scrollHeight;
            while (y < max) { window.scrollTo(0, y); await sleep(700); y += step; }
            window.scrollTo(0, document.body.scrollHeight); await sleep(1500);
            window.scrollTo(0, 0); await sleep(500);
        });
        await mp.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => { });
        await mp.evaluate(() => Promise.all(Array.from(document.images).map(img => img.complete && img.naturalWidth > 0 ? null : new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 8000); }))));
        await mp.waitForTimeout(4000);
        await mp.screenshot({ path: join(OUT, 'mobile-home.png'), fullPage: true });
        log('mobile-home.png');
        await mob.close();
    } catch (e) { log('mobile-home failed:', e.message); }

    await browser.close();
    log('done →', OUT);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
