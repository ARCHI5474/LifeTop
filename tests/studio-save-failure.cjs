const assert = require('node:assert/strict');
const {withApp} = require('./helpers/browser.cjs');

withApp(async page => {
    await page.goto('http://localhost/mini-apps.html#document');
    await page.locator('#editor').fill('保存済みの文書');
    await page.evaluate(() => window.flushMiniApp());
    await page.evaluate(() => {
        window.originalTransaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(names, mode, ...rest) {
            if (this.name === 'lifetop-mini-apps' && mode === 'readwrite') throw new DOMException('容量不足', 'QuotaExceededError');
            return window.originalTransaction.call(this, names, mode, ...rest);
        };
    });
    await page.locator('#editor').fill('保存に失敗した重要な追記');
    await page.locator('#mini-picker').selectOption('sheet');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#editor').isVisible(), true, 'failed autosave must keep the edited document open');
    assert.equal(await page.locator('#editor').innerText(), '保存に失敗した重要な追記');
    assert.equal(await page.locator('#mini-status').getAttribute('data-error'), 'true');
    await page.locator('#mini-home-button').click();
    assert.equal(await page.locator('#editor').isVisible(), true, 'failed save must block returning to the catalog');
    const backup = page.waitForEvent('download');
    await page.locator('#mini-project-save').click();
    assert.match((await backup).suggestedFilename(), /\.lifetop\.json$/);
    await page.evaluate(() => IDBDatabase.prototype.transaction = window.originalTransaction);
    await page.evaluate(() => window.flushMiniApp());
    await page.reload();
    await page.locator('#editor').waitFor();
    assert.equal(await page.locator('#editor').innerText(), '保存に失敗した重要な追記');
    await page.goto('http://localhost/');
    await page.locator('.dashboard-header [aria-label="Studioを開く"]').click();
    const frame = page.frameLocator('#mini-app-dialog iframe');
    await frame.locator('[data-app=document]').click();
    await frame.locator('#editor').fill('ポップアップ内の未保存追記');
    const studio = page.frames().find(frame => frame.url().includes('mini-apps.html'));
    await studio.evaluate(() => {
        window.originalTransaction = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function(names, mode, ...rest) {
            if (this.name === 'lifetop-mini-apps' && mode === 'readwrite') throw new DOMException('容量不足', 'QuotaExceededError');
            return window.originalTransaction.call(this, names, mode, ...rest);
        };
    });
    await page.locator('#mini-app-dialog [data-cancel]').click();
    await page.locator('#mini-app-dialog [role=status]').filter({hasText:'保存できませんでした'}).waitFor();
    assert.equal(await frame.locator('#editor').innerText(), 'ポップアップ内の未保存追記');
    await studio.evaluate(() => IDBDatabase.prototype.transaction = window.originalTransaction);
    await page.locator('#mini-app-dialog [data-cancel]').click();
    await page.locator('#mini-app-dialog').waitFor({state:'detached'});
    console.log('PASS: failed Studio autosave blocks app/home/popup exit, backup export remains available, retry persists edits');
}).catch(error => {console.error(error);process.exitCode=1;});
