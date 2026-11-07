const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.evaluate(async () => {
        const { openUIDialog } = await import('./js/ui-dialog.js');
        const dialog = document.createElement('dialog');
        dialog.id = 'lifecycle-test';
        dialog.className = 'ui-scope';
        dialog.innerHTML = '<button data-cancel>閉じる</button>';
        document.body.append(dialog);
        window.closeChecks = 0;
        window.lifecycle = openUIDialog(dialog, { onRequestClose: () => {
            window.closeChecks++;
            return new Promise(resolve => { window.resolveClose = resolve; });
        }});
    });
    await page.evaluate(() => {
        window.lifecycle.close();
        window.lifecycle.close();
    });
    assert.equal(await page.evaluate(() => window.closeChecks), 1, 'repeated close requests share one confirmation');
    await page.evaluate(() => window.resolveClose(false));
    assert.equal(await page.locator('#lifecycle-test').evaluate(e => e.open), true);
    await page.evaluate(() => { window.lifecycle.close(); });
    assert.equal(await page.evaluate(() => window.closeChecks), 2, 'declined close can be retried');
    await page.evaluate(() => window.resolveClose(true));
    await page.locator('#lifecycle-test').waitFor({ state: 'detached' });
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('ui-modal-open')), false);
    console.log('PASS: asynchronous close deduplication, declined confirmation retry and modal cleanup');
}).catch(error => { console.error(error); process.exitCode = 1; });
