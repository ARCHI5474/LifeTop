const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

(async () => {
    await withApp(async page => {
        const dialog = page.locator('#closure-notice-dialog');
        const banner = page.locator('#closure-notice');
        const text = '2027年1月をもってサービスの提供を終了いたします。';

        assert.equal(await dialog.isVisible(), true);
        assert.match(await dialog.innerText(), new RegExp(text));
        assert.match(await banner.innerText(), new RegExp(text));

        await page.locator('#closure-notice-close').click();
        assert.equal(await dialog.isVisible(), false);
        assert.equal(await page.evaluate(() => localStorage.getItem('lifetop_closure_notice_dismissed')), null);

        await page.reload();
        await page.locator('#closure-notice-dialog[open]').waitFor();
        await page.locator('#closure-notice-dismiss').click();
        assert.equal(await dialog.isVisible(), false);
        assert.equal(await page.evaluate(() => localStorage.getItem('lifetop_closure_notice_dismissed')), 'true');
        assert.equal(await banner.isVisible(), true);

        await page.reload();
        assert.equal(await dialog.isVisible(), false);
        assert.equal(await banner.isVisible(), true);
    }, { dismissClosureNotice: false });
    console.log('PASS: closure notice banner and startup dialog dismissal preferences');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
