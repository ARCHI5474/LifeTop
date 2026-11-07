const { createRequire } = require('node:module');
const { chromium: engine } = createRequire(process.env.PLAYWRIGHT_MODULE_PATH || require.resolve('playwright'))('playwright');

exports.chromium = {
    async launch(options) {
        const browser = await engine.launch(options);
        const newContext = browser.newContext.bind(browser);
        browser.newContext = async options => {
            const context = await newContext(options);
            context.setDefaultTimeout(10_000);
            return context;
        };
        const newPage = browser.newPage.bind(browser);
        browser.newPage = async options => {
            const page = await newPage(options);
            page.setDefaultTimeout(10_000);
            return page;
        };
        return browser;
    },
};

exports.withApp = async function withApp(test) {
    const assert = require('node:assert/strict');
    const fs = require('node:fs/promises');
    const path = require('node:path');
    const root = path.resolve(__dirname, '../..');
    const browser = await exports.chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Tokyo' });
        const errors = [], missing = [];
        context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://localhost') return route.abort();
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
            if (!file.startsWith(root + path.sep)) return route.abort();
            try {
                const contentType = { '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' }[path.extname(file)] || 'text/html';
                await route.fulfill({ body: await fs.readFile(file), contentType });
            } catch {
                missing.push(url.pathname);
                await route.fulfill({ status: 404, body: '' });
            }
        });
        const page = await context.newPage();
        await page.goto('http://localhost/');
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        await page.locator('#cc-settings-storage .cc-settings-layout').waitFor({ state: 'attached' });
        await test(page, context);
        assert.deepEqual(errors, [], 'no uncaught browser errors');
        assert.deepEqual(missing, [], 'all requested local assets exist');
    } finally {
        await browser.close();
    }
};

exports.openGames = async function openGames(page) {
    await page.locator('.dashboard-header [aria-label="Studioを開く"]').click();
    await page.locator('#mini-app-dialog [data-view=games]').click();
    await page.locator('#game-modal.active').waitFor();
};

exports.selectGame = async function selectGame(page, game) {
    const picker = page.locator('#gamebox-select');
    if (await picker.isVisible()) await picker.selectOption(game);
    else await page.locator(`[data-game-tab="${game}"]`).click();
};
