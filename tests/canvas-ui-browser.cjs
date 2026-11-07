const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.locator('[data-cc=dashboard-edit]').click();
    await page.locator('[data-dashboard-visible=base-access]').uncheck();
    await page.locator('.bookmark-card').waitFor({state:'hidden'});
    await page.locator('[data-dashboard-visible=base-access]').check();
    await page.locator('.bookmark-card').waitFor();
    await page.locator('[data-dashboard-size=base-access]').selectOption('2');
    await page.locator('[data-cc=widget-left][data-id=base-quick]').click();
    await page.getByRole('button',{name:'完了',exact:true}).click();
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.dashboard-grid').firstElementChild.classList.contains('utility-card'));
    assert.equal(await page.locator('.bookmark-card').evaluate(e => e.style.gridColumn), '1 / -1');
    await page.evaluate(async () => {
        const m = await import('./js/canvas-model.js');
        await m.saveStudioFile({format:'lifetop-mini',version:1,app:'document',name:'企画書 <img src=x onerror=alert(1)>',state:{html:'<p>企画書</p>'}});
        await m.saveStudioFile({format:'lifetop-mini',version:1,app:'sheet',name:'作業予定表',state:{grid:[['日付','担当']]}});
    });
    await page.reload();
    await page.locator('.dashboard-header [aria-label="ファイル"]').click();
    await page.locator('.cc-saved-files .cc-row').nth(1).waitFor();
    assert.equal(await page.locator('#cc-body img').count(), 0);
    await page.locator('#cc-workspace-query').fill('企画');
    assert.equal(await page.locator('.cc-saved-files .cc-row').count(), 1);
    await page.locator('[data-cc=file-rename]').click();
    const form = page.locator('dialog.cc-form-dialog form');
    await form.locator('[name=name]').fill('企画書・改訂版');
    await form.locator('[type=submit]').click();
    await page.locator('dialog.cc-form-dialog').waitFor({state:'detached'});
    await page.locator('.cc-saved-files').getByText('企画書・改訂版', {exact:true}).waitFor();
    await page.locator('#cc-workspace-query').fill('');
    for (const width of [375, 768, 1440]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.locator('#cc-dialog').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    }
    await page.keyboard.press('Escape');
    await page.locator('#cc-dialog').waitFor({state:'detached'});
    await page.reload();
    await page.locator('.dashboard-header [aria-label="ファイル"]').click();
    await page.locator('.cc-saved-files').getByText('企画書・改訂版', {exact:true}).waitFor();
    console.log('PASS: dashboard visibility/size/order persistence, file filtering/rename/XSS and responsive file dialog');
}).catch(error => {console.error(error); process.exitCode = 1;});
