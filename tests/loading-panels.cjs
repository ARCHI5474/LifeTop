const assert = require('node:assert/strict');
const { withApp, openGames } = require('./helpers/browser.cjs');

withApp(async page => {
    for (const reducedMotion of ['no-preference','reduce']) {
        await page.emulateMedia({reducedMotion});
        await page.reload();
        await page.locator('#loading-screen').waitFor({state:'detached',timeout:5000});
        assert.equal(await page.locator('.dashboard-header').evaluate(e => e.inert), false);
        assert.equal(await page.locator('#game-modal').evaluate(e => e.inert), true);
        await openGames(page);
        await page.getByRole('button',{name:'遊び方を表示'}).click();
        await page.locator('#game-rules:popover-open').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#game-modal').evaluate(e => e.inert), false);
        await page.keyboard.press('Escape');
        await page.locator('#mini-app-dialog').waitFor({state:'detached'});
        assert.equal(await page.locator('#game-modal').evaluate(e => e.inert), true);
        for (const [open, selector] of [['showWeatherDetail','#weather-detail-modal'],['openBookmarkDialog','#bookmark-dialog']]) {
            await page.evaluate(name => window[name](),open);
            assert.equal(await page.locator(selector).evaluate(e => e.inert), false);
            if(reducedMotion==='reduce') {
                assert.equal(await page.locator(selector).evaluate(e => getComputedStyle(e).transitionDuration.split(',').every(v => parseFloat(v)<=0.001)), true);
            }
            await page.keyboard.press('Escape');
            await page.waitForFunction(selector => document.querySelector(selector).inert,selector);
        }
        await page.locator('[aria-label="Quickパネル"]').click();
        assert.equal(await page.locator('#settings-panel').evaluate(e => e.inert), false);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('#settings-panel').inert);
    }
    console.log('PASS: immediate startup, native and legacy modal lifecycle, nested instructions and reduced motion');
}).catch(error => {console.error(error);process.exitCode=1;});
