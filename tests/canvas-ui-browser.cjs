const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    assert.equal(await page.locator('[data-cc=dashboard-edit]').count(),0);
    assert.equal(await page.locator('#cc-dashboard-editor').count(),0);
    await page.evaluate(async () => {
        const m = await import('./js/canvas-model.js?v=14.0.0');
        const state = await m.readCanvas();
        state.dashboard.hidden.push('base-access');
        await m.commitCanvas(state,state.revision);
        await m.saveStudioFile({format:'lifetop-mini',version:1,app:'document',name:'企画書 <img src=x onerror=alert(1)>',state:{html:'<p>企画書</p>'}});
        await m.saveStudioFile({format:'lifetop-mini',version:1,app:'sheet',name:'作業予定表',state:{grid:[['日付','担当']]}});
    });
    await page.reload();
    await page.locator('.bookmark-card').waitFor();
    await require('./helpers/browser.cjs').openQuick(page);
    assert.equal(await page.locator('[data-quick-tile=files]').count(),0);
    await page.locator('[data-quick-tile=search]').click();
    await page.locator('#cc-query').fill('企画');
    await page.locator('.cc-empty').waitFor();
    assert.equal(await page.locator('#cc-search-kind option[value=file]').count(),0);
    assert.equal(await page.locator('#cc-body img').count(),0);
    for (const width of [375,768,1440]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.locator('#cc-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);
    }
    console.log('PASS: removed file navigation, search exclusion and responsive search dialog');
}).catch(error => {console.error(error); process.exitCode = 1;});
