const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    for (const cache of ['null', '[]', 'false', '7', '"text"', '{invalid']) {
        await page.evaluate(cache => localStorage.setItem('lifetop-v10-horoscope', cache), cache);
        await page.reload();
        await page.locator('#cc-settings-storage .cc-settings-layout').waitFor({state:'attached'});
        await page.locator('#home-calendar-card').click();
        await page.locator('#cc-dialog.cc-calendar-only').waitFor();
        assert.equal(await page.locator('#cc-title').innerText(), 'カレンダー');
        await page.keyboard.press('Escape');
        await page.locator('#cc-dialog').waitFor({state:'detached'});
    }
    console.log('PASS: malformed horoscope caches do not interrupt home/calendar initialization');
}).catch(error => { console.error(error); process.exitCode = 1; });
