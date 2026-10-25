const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(process.env.PLAYWRIGHT_MODULE_PATH || require.resolve('playwright'))('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
    try {
        const page = await browser.newPage();
        const errors = [], overflow = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://lifetop.test') return route.abort();
            const file = path.resolve(__dirname, '..', '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
            try { await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.ttf') ? 'font/ttf' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' }); }
            catch { await route.fulfill({ status: 404, body: '' }); }
        });
        await page.goto('http://lifetop.test');
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        await page.evaluate(() => {
            const key = 'lifetop_v1_0_data';
            const config = JSON.parse(localStorage.getItem(key) || '{}');
            config.username = '長い名前のプロフィール表示を確認する';
            config.clock12h = true;
            config.clockShowSec = true;
            config.todoList = [{ id: 1, text: 'ResponsiveLayout'.repeat(15), completed: false }];
            localStorage.setItem(key, JSON.stringify(config));
            const entry = items => ({items, timestamp:Date.now(), provider:'audit-fixture'});
            localStorage.setItem('lifetop_news_cache_v2',JSON.stringify({top:entry(Array.from({length:6},(_,i)=>({title:'長いニュース見出しと表示確認 '+i+' ArticleTitle'.repeat(12),url:'https://example.com/news/'+i,source:'長い配信元の名前の表示を確認します',pubDate:new Date().toISOString()})))}));
            localStorage.setItem('lifetop_trends_cache_v1',JSON.stringify({jp:entry(Array.from({length:6},(_,i)=>({keyword:'VeryLongTrendingKeyword'.repeat(8)+i,badge:'急上昇',context:'長い補足説明の表示を確認します。'.repeat(4),url:'https://example.com/trends/'+i})))}));
            localStorage.setItem('lifetop_youtube_cache_v1',JSON.stringify({trending:entry(Array.from({length:4},(_,i)=>({title:'長い動画タイトル '+i+' VideoTitle'.repeat(12),channel:'長いチャンネル名の表示確認',url:'https://example.com/video/'+i,thumbnail:'https://example.com/thumbnail/'+i,pubDate:new Date().toISOString()})))}));
        });
        await page.reload();
        await page.locator('#loading-screen').waitFor({ state: 'detached' });
        const scan = async label => {
            const found = await page.locator('.dashboard-header, .hero-section, .glass-card, .card-header, .utility-tabs, .tab-content.active, .clock-tool-pane.active, .settings-section, .profile-field, .choice-group, .game-pane.active').evaluateAll(elements => elements.filter(e => {
                const r = e.getBoundingClientRect();
                const style = getComputedStyle(e);
                return r.width && r.height && style.visibility !== 'hidden' && e.scrollWidth > e.clientWidth + 2 && !['auto', 'scroll'].includes(style.overflowX);
            }).map(e => ({ id: e.id, class: e.className, width: e.clientWidth, content: e.scrollWidth, children: [...e.querySelectorAll('*')].filter(c=>c.getBoundingClientRect().right>e.getBoundingClientRect().right+2).map(c=>[c.className,c.getBoundingClientRect().width]) })));
            if (found.length) overflow.push({ label, found });
        };
        for (const [width, height] of [[320, 740], [360, 800], [390, 844], [600, 900], [768, 1024], [900, 900], [1024, 900], [1440, 1000], [740, 360]].filter(([w]) => !process.env.LAYOUT_WIDTH || w === Number(process.env.LAYOUT_WIDTH))) {
            await page.setViewportSize({ width, height });
            for (const tab of ['todo', 'memo', 'clock']) {
                await page.locator('.utility-tabs [data-tab="' + tab + '"]').click();
                await scan(width + 'x' + height + ':' + tab);
            }
            const before = await page.locator('.hero-section').boundingBox();
            await page.getByRole('button', { name: 'Quickパネル', exact: true }).click();
            await page.waitForTimeout(420);
            const after = await page.locator('.hero-section').boundingBox();
            assert.equal(after.x, before.x, 'drawer must not shift dashboard');
            assert.equal(after.width, before.width, 'drawer must not resize dashboard');
            await scan(width + ':profile');
            if (width === 390 && process.env.REVIEW_SCREENSHOT) {
                await page.locator('#profile-avatar-preview').scrollIntoViewIfNeeded();
                await page.screenshot({ path: process.env.REVIEW_SCREENSHOT + '-profile.png' });
            }
            if (!(await page.locator('.advanced-settings').getAttribute('open')) && !(await page.locator('.advanced-settings').evaluate(e => e.open))) await page.locator('.advanced-settings summary').click();
            await page.locator('#advanced-reset').scrollIntoViewIfNeeded();
            await scan(width + ':advanced');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(260);
            await page.evaluate(() => window.toggleGameModal(true));
            for (const game of ['snake', 'puzzle', 'othello', 'go', 'shogi', 'hitblow']) {
                await page.locator('[data-game-tab="' + game + '"]').click();
                await scan(width + ':' + game);
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(260);
        }
        assert.deepEqual(overflow, [], 'no clipped card or panel contents');
        assert.deepEqual(errors, []);
        console.log('PASS: 9 viewport sizes, long names/tasks, 12h clock and seconds, 6 games, profile controls, drawer without layout shift');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
