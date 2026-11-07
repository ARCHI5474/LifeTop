const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async (page, context) => {
    await page.evaluate(async () => {
        const { openUIDialog } = await import('./js/ui-dialog.js');
        const dialog = document.createElement('dialog');
        dialog.id = 'deferred-close';
        dialog.className = 'ui-scope';
        dialog.innerHTML = '<button>閉じる</button>';
        document.body.append(dialog);
        window.finishClose = null;
        window.closeSettled = [false, false];
        const lifecycle = openUIDialog(dialog, {onRequestClose: () => new Promise(resolve => {window.finishClose = resolve;})});
        lifecycle.close().then(() => {window.closeSettled[0] = true;});
        lifecycle.close().then(() => {window.closeSettled[1] = true;});
    });
    assert.deepEqual(await page.evaluate(() => window.closeSettled), [false, false], 'all close callers wait for the asynchronous decision');
    await page.evaluate(() => window.finishClose(true));
    await page.locator('#deferred-close').waitFor({state:'detached'});
    assert.deepEqual(await page.evaluate(() => window.closeSettled), [true, true]);

    await context.route(/\/js\/festival-config\.js(?:\?.*)?$/, route => route.fulfill({
        contentType:'text/javascript',
        body:`export const festivalConfig = {startAt:${JSON.stringify(new Date(Date.now() - 60_000).toISOString())},durationDays:10};`,
    }));
    await page.goto('http://localhost/festival.html');
    await page.locator('#festival-start').click();
    await page.waitForTimeout(100);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted:true})));
    const paused = Number(await page.locator('#festival-timer').innerText());
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})));
    await page.waitForTimeout(120);
    assert.ok(Number(await page.locator('#festival-timer').innerText()) > paused, 'restored Festival keeps its running timer updating');
    await page.locator('#festival-stop').click();
    console.log('PASS: shared asynchronous close completion and restored Festival timer');
}).catch(error => {console.error(error); process.exitCode = 1;});
