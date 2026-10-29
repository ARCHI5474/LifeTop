const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://lifetop.test') return route.abort();
            const file = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
            try { await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.ttf') ? 'font/ttf' : 'text/html' }); }
            catch { await route.fulfill({ status: 404, body: '' }); }
        });
        await page.goto('http://lifetop.test');
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        const control = page.locator('[data-tab="memo"]');
        await control.click();
        const hasBounce = () => control.evaluate(e => e.getAnimations().some(a => a.effect.getKeyframes().some(frame => frame.scale === '1.025 1.015')));
        assert.equal(await hasBounce(), true, 'short mouse click releases with a bounce');
        await page.waitForTimeout(400);
        await control.tap();
        assert.equal(await hasBounce(), true, 'short touch tap releases with the same bounce');
        await page.waitForTimeout(400);
        await control.evaluate(e => {
            e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 99, isPrimary: true, button: 0, clientX: 10, clientY: 10 }));
            e.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 99, isPrimary: true, clientX: 10, clientY: 50 }));
            e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 99, isPrimary: true, clientX: 10, clientY: 50 }));
        });
        assert.equal(await hasBounce(), false, 'scroll/drag movement cancels the bounce');
        await page.waitForTimeout(150);
        await control.focus();
        await page.keyboard.press('Enter');
        assert.equal(await hasBounce(), true, 'keyboard activation also bounces');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await hasBounce(), false, 'changing the preference cancels in-flight feedback');
        await control.tap();
        assert.equal(await hasBounce(), false, 'reduced motion suppresses touch feedback');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.locator('[data-tab="todo"]').click();
        await page.waitForTimeout(500);
        const card = page.locator('.glass-card').filter({ has: page.locator('.card-header') }).first();
        await card.scrollIntoViewIfNeeded();
        for (const selector of ['.glass-card', '.hero-section', '.search-form']) {
            const material = await page.locator(selector).first().evaluate(e => ({ background: getComputedStyle(e).backgroundImage, shadow: getComputedStyle(e).boxShadow }));
            assert.notEqual(material.background, 'none', selector + ' has a valid sheen');
            assert.notEqual(material.shadow, 'none', selector + ' has depth');
        }
        const header = await card.locator('.card-header h3').boundingBox();
        await page.mouse.move(header.x + 4, header.y + header.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(140);
        assert.match(await card.evaluate(e => getComputedStyle(e).scale), /0\.99/);
        await page.mouse.up();
        await page.waitForTimeout(500);
        const child = card.locator('button').first();
        await child.focus();
        await page.keyboard.down('Space');
        const childScale = await card.evaluate(e => getComputedStyle(e).scale);
        assert.ok(childScale === 'none' || childScale.split(' ').every(n => Math.abs(Number(n) - 1) < .001), childScale);
        await page.keyboard.up('Space');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.mouse.move(header.x + 4, header.y + header.height / 2);
        await page.mouse.down();
        assert.equal(await card.evaluate(e => getComputedStyle(e).scale), 'none');
        await page.mouse.up();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForTimeout(1000);
        await page.locator('body').click({ position: { x: 2, y: 2 } });
        if (process.env.REVIEW_SCREENSHOT) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: process.env.REVIEW_SCREENSHOT + '-desktop.png', fullPage: true });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: process.env.REVIEW_SCREENSHOT + '-mobile.png', fullPage: true });
        }
        console.log('PASS: mouse/touch/keyboard bounce, live reduced motion, card press/release and stable child controls');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
