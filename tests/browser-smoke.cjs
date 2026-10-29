const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(process.env.PLAYWRIGHT_MODULE_PATH || require.resolve('playwright'));
const { chromium } = runtimeRequire('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Serve the real app through routing, without relying on external services.
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://lifetop.test') return route.abort();
            const file = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
            try {
                await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.ttf') ? 'font/ttf' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' });
            } catch { await route.fulfill({ status: 404, body: '' }); }
        });
        await page.goto('http://lifetop.test/', { waitUntil: 'domcontentloaded' });
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        const bookmarkMotion = await page.evaluate(() => {
            const tabs = [...document.querySelectorAll('.bookmark-tab-item')];
            const original = tabs[0];
            tabs[1].click();
            const animated = document.querySelector('#bookmark-grid').getAnimations({ subtree: true }).length;
            tabs[2].click();
            tabs[1].click();
            return { sameButtons: original === document.querySelector('.bookmark-tab-item'),
                selected: document.querySelector('.bookmark-tab-item.active').textContent === tabs[1].textContent,
                focused: document.activeElement === tabs[1], animated };
        });
        assert.ok(bookmarkMotion.sameButtons && bookmarkMotion.selected && bookmarkMotion.focused);
        assert.ok(bookmarkMotion.animated > 0, 'category items animate on switch');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.locator('.bookmark-tab-item').first().click();
        assert.equal(await page.locator('#bookmark-grid').evaluate(e => e.getAnimations({ subtree: true }).length), 0);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.locator('#todo-input').fill('ブラウザ動作確認');
        await page.locator('#todo-input').press('Enter');
        assert.match(await page.locator('#todo-list').innerText(), /ブラウザ動作確認/);
        await page.locator('[data-tab="memo"]').click();
        await page.locator('#memo-editor').fill('保存確認メモ');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-tab="memo"]').click();
        assert.equal(await page.locator('#memo-editor').innerText(), '保存確認メモ');
        await page.locator('[data-tab="todo"]').click();
        assert.match(await page.locator('#todo-list').innerText(), /ブラウザ動作確認/);
        // Reusing a recently deleted ID makes undo produce two tasks with one ID.
        await page.evaluate(() => { window.originalDateNow = Date.now; Date.now = () => 2000000000000; });
        await page.locator('#todo-input').fill('元のタスク');
        await page.locator('#todo-input').press('Enter');
        await page.locator('[aria-label="元のタスクを削除"]').click();
        await page.locator('#todo-input').fill('新しいタスク');
        await page.locator('#todo-input').press('Enter');
        await page.locator('#todo-undo button').click();
        const ids = await page.locator('.todo-item').evaluateAll(items => items.map(item => item.id));
        assert.equal(new Set(ids).size, ids.length, 'undo must not restore a duplicate task ID');
        await page.getByRole('checkbox', { name: '新しいタスク', exact: true }).check();
        await page.locator('#todo-clear-completed-btn').click();
        await page.locator('#todo-input').fill('一括削除後のタスク');
        await page.locator('#todo-input').press('Enter');
        await page.locator('#todo-undo button').click();
        const restoredIds = await page.locator('.todo-item').evaluateAll(items => items.map(item => item.id));
        assert.equal(new Set(restoredIds).size, restoredIds.length);
        await page.evaluate(() => { Date.now = window.originalDateNow; delete window.originalDateNow; });
        await page.locator('[data-tab="clock"]').click();
        await page.locator('[data-duration="60"]').click();
        assert.equal(await page.locator('#timer-display').innerText(), '01:00');
        await page.locator('#timer-start-btn').click();
        await page.waitForTimeout(1100);
        assert.notEqual(await page.locator('#timer-display').innerText(), '01:00');
        await page.locator('#timer-start-btn').click();
        await page.locator('[aria-label="タイマーをリセット"]').click();
        assert.equal(await page.locator('#timer-display').innerText(), '01:00');
        await page.locator('[aria-label="Quickパネル"]').click();
        assert.equal(await page.locator('#settings-panel').evaluate(el => el.inert), false);
        assert.equal(await page.locator('.settings-about-version').innerText(), 'LifeTop v7.0');
        assert.equal(await page.locator('.settings-about-codename').innerText(), 'コードネーム：Bounce gummy');
        assert.equal(await page.locator('.settings-body').evaluate(e => e.lastElementChild.matches('.settings-about')), true);
        assert.match(await page.locator('#notice-text').innerText(), /v7\.0/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#settings-panel').evaluate(el => el.inert), true);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-tab="todo"]').click();
        assert.equal(await page.locator('#todo-input').isVisible(), true);
        await page.locator('[aria-label="Quickパネル"]').click();
        assert.equal(await page.locator('[data-color-mode-btn]').count(), 0);
        await page.locator('.settings-about').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('.settings-about').evaluate(e => e.scrollWidth <= e.clientWidth), true);
        if (process.env.REVIEW_SCREENSHOT) {
            await page.waitForTimeout(450);
            await page.screenshot({ path: process.env.REVIEW_SCREENSHOT + '-quick-info.png' });
        }
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            const key = 'lifetop_v1_0_data';
            const saved = JSON.parse(localStorage.getItem(key));
            saved.colorMode = 'light';
            saved.clockTransparency = 90;
            saved.cardTransparency = 80;
            localStorage.setItem(key, JSON.stringify(saved));
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        assert.equal(await page.locator('html').getAttribute('data-color-mode'), 'dark');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
        await page.evaluate(async () => {
            const { userConfig } = await import('/js/config.js?v=7.0');
            if ('clockTransparency' in userConfig || 'cardTransparency' in userConfig) throw Error('obsolete transparency settings');
        });
        assert.deepEqual(errors, [], 'no uncaught application errors');
        console.log('PASS: browser startup, tasks, memo persistence, timer, settings, mobile tabs and migration from retired light/transparency settings');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
