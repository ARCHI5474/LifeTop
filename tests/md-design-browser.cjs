const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.evaluate(async () => {
        const m = await import('./js/canvas-model.js');
        const state = await m.readCanvas();
        state.files = Array.from({length:48}, (_,i) => ({id:'file'+i,format:'lifetop-mini',version:1,kind:'studio',app:'document',name:i===0?'日本語とEnglish'.repeat(12):'制作資料 '+i,state:{html:'<p>本文</p>'},createdAt:Date.now(),updatedAt:Date.now()}));
        await m.commitCanvas(state,state.revision);
    });
    await page.reload();
    for (const width of [375,768,1440]) {
        await page.setViewportSize({width,height:1000});
        await page.locator('.dashboard-header [aria-label="ファイル"]').click();
        assert.equal(await page.locator('.cc-saved-files .cc-row').count(),48);
        assert.equal(await page.locator('.cc-app-main').evaluate(e => e.scrollWidth <= e.clientWidth+1),true);
        await page.locator('#cc-workspace-query').fill('English');
        assert.equal(await page.locator('.cc-saved-files .cc-row').count(),1);
        await page.locator('#cc-workspace-query').fill('');
        await page.keyboard.press('Escape');
        await page.locator('#cc-dialog').waitFor({state:'detached'});
    }
    await page.locator('.dashboard-header [aria-label="ファイル"]').click();
    await page.locator('[data-cc=file-rename]').first().click();
    const form = page.locator('dialog.cc-form-dialog form');
    await form.locator('[name=name]').fill('変更を維持');
    for(let i=0;i<12;i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.querySelector('dialog.cc-form-dialog').contains(document.activeElement)),true);
    }
    page.once('dialog',dialog => dialog.dismiss());
    await page.keyboard.press('Escape');
    assert.equal(await form.locator('[name=name]').inputValue(),'変更を維持');
    await page.evaluate(() => {
        window.originalTransaction=IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction=function(names,mode,...rest) {
            if(this.name==='lifetop-connected-canvas'&&mode==='readwrite')throw new DOMException('保存できません。容量を確認してください。','QuotaExceededError');
            return window.originalTransaction.call(this,names,mode,...rest);
        };
    });
    await form.locator('[type=submit]').click();
    await form.locator('[role=alert]').filter({hasText:'保存できません'}).waitFor();
    assert.equal(await form.locator('[name=name]').inputValue(),'変更を維持');
    assert.equal(await form.locator('[type=submit]').isEnabled(),true);
    await page.evaluate(() => IDBDatabase.prototype.transaction=window.originalTransaction);
    await form.locator('[type=submit]').click();
    await page.locator('dialog.cc-form-dialog').waitFor({state:'detached'});
    assert.equal(await page.evaluate(() => document.querySelector('#cc-dialog').contains(document.activeElement)),true);
    await page.keyboard.press('Escape');
    await page.locator('#cc-dialog').waitFor({state:'detached'});
    await page.keyboard.press('Control+k');
    await page.locator('#cc-query').fill('変更を維持');
    await page.locator('[data-cc=result-file]').filter({hasText:'変更を維持'}).waitFor();
    console.log('PASS: 48 files/long names at 375/768/1440, filter/search, modal focus trap, dirty cancel, storage quota error and retry');
}).catch(error => {console.error(error);process.exitCode=1;});
