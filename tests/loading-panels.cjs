const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(process.env.PLAYWRIGHT_MODULE_PATH || require.resolve('playwright'));
const { chromium } = runtimeRequire('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
    try {
        for (const reducedMotion of ['no-preference', 'reduce']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                new MutationObserver(() => {
                    const loader = document.getElementById('loading-screen');
                    if (!loader) return;
                    window.loadingSeenAt ??= performance.now();
                    if (loader.classList.contains('is-hidden')) window.loadingHiddenAt ??= performance.now();
                }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
            });
            await page.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.origin !== 'http://lifetop.test') return route.abort();
                const file = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
                try { await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.ttf') ? 'font/ttf' : 'text/html' }); }
                catch { await route.fulfill({ status: 404, body: '' }); }
            });
            await page.goto('http://lifetop.test', { waitUntil: 'domcontentloaded' });
            await page.locator('#loading-screen').waitFor({ state: 'detached', timeout: 5000 });
            assert.equal(await page.locator('.dashboard-header').evaluate(e => e.inert), false);
            assert.equal(await page.locator('#game-modal').evaluate(e => e.inert), true);
            await page.locator('#game-open-btn').click();
            assert.equal(await page.locator('.game-modal-card').evaluate(e => getComputedStyle(e).animationName), reducedMotion === 'reduce' ? 'none' : 'window-bounce-in');
            await page.getByRole('button', { name: '遊び方を表示' }).click();
            assert.equal(await page.locator('#game-rules').evaluate(e => getComputedStyle(e).animationName), reducedMotion === 'reduce' ? 'none' : 'window-bounce-in');
            await page.keyboard.press('Escape');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(250);
            for (const [open, selector] of [
                ['showWeatherDetail', '.weather-modal-content'],
                ['openBookmarkDialog', '#bookmark-dialog .popup-modal-card']
            ]) {
                await page.evaluate(name => window[name](), open);
                assert.equal(await page.locator(selector).evaluate(e => getComputedStyle(e).animationName), reducedMotion === 'reduce' ? 'none' : 'window-bounce-in');
                await page.keyboard.press('Escape');
                await page.waitForTimeout(250);
            }
            await page.getByRole('button', { name: 'Quickパネル' }).click();
            const transition = await page.locator('#settings-panel').evaluate(e => getComputedStyle(e).transitionTimingFunction);
            assert.ok(reducedMotion === 'reduce' || transition.includes('0.8'), 'Quick panel uses fast easing');
            if (reducedMotion !== 'reduce') assert.ok((await page.locator('#settings-panel').evaluate(e => getComputedStyle(e).transitionDuration)).startsWith('0.11s'), 'Quick panel opens in 110ms');
            if (reducedMotion === 'reduce') assert.equal(await page.locator('#settings-panel').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('PASS: immediate loader dismissal, inert restoration, fast dialog/panel motion and reduced motion');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
