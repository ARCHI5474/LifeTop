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
                await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' });
            } catch { await route.fulfill({ status: 404, body: '' }); }
        });
        await page.goto('http://lifetop.test/', { waitUntil: 'domcontentloaded' });
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
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
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#settings-panel').evaluate(el => el.inert), true);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-tab="todo"]').click();
        assert.equal(await page.locator('#todo-input').isVisible(), true);
        await page.locator('[aria-label="Quickパネル"]').click();
        await page.locator('[data-color-mode-btn="light"]').click();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
        const checkedBackground = await page.locator('input.todo-checkbox:checked').first().evaluate(el => getComputedStyle(el).backgroundColor);
        assert.notEqual(checkedBackground, 'rgba(255, 255, 255, 0.9)', 'checked tasks must keep their accent fill in light mode');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
        // Hold the entry module to verify the saved mode before app startup.
        let releaseEntry;
        const entryGate = new Promise(resolve => { releaseEntry = resolve; });
        const holdEntry = async route => { await entryGate; await route.fallback(); };
        await page.route('**/js/main.js*', holdEntry);
        const reloading = page.reload({ waitUntil: 'domcontentloaded' });
        try {
            await page.waitForFunction(() => document.querySelector('#loading-screen') &&
                getComputedStyle(document.documentElement).colorScheme === 'light' &&
                getComputedStyle(document.querySelector('#loading-screen')).backgroundColor === 'rgb(238, 245, 252)');
        } finally { releaseEntry(); }
        await reloading;
        await page.unroute('**/js/main.js*', holdEntry);
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        assert.equal(await page.locator('html').getAttribute('data-color-mode'), 'light');
        // Repeated switches must settle to the same palette and native controls.
        await page.evaluate(() => {
            for (let i = 0; i < 6; i++) { window.setColorMode('dark'); window.setColorMode('light'); }
        });
        await page.waitForFunction(() => !document.documentElement.classList.contains('theme-changing'));
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(15, 29, 51)');
        await page.evaluate(async () => {
            const { userConfig } = await import('/js/config.js?v=4.0-final');
            userConfig.bgImage = 'https://unavailable.test/wallpaper.png';
            window.setColorMode('light');
        });
        assert.match(await page.locator('#bg-overlay').evaluate(el => getComputedStyle(el).backgroundImage), /linear-gradient/,
            'failed wallpaper must fall back to the light palette');
        if (process.env.SCREENSHOT_DIR) {
            await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
            await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'light-mobile.png') });
            await page.setViewportSize({ width: 1440, height: 1000 });
            await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'light-desktop.png') });
        }
        assert.deepEqual(errors, [], 'no uncaught application errors');
        console.log('PASS: browser startup, tasks, memo persistence, timer, settings, mobile tabs and light mode (checks, early restore, repeated switching, wallpaper fallback)');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
