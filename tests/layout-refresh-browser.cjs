const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.evaluate(() => document.documentElement.classList.add('reduce-motion'));
    const welcome = page.locator('.festival-pop button').filter({hasText:'閉じる'});
    if(await welcome.isVisible()) await welcome.click();
    for(const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(() => scrollTo(0,0));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),true);
        if(await page.locator('.festival-banner').isVisible()){
            const banner=await page.locator('.festival-banner').boundingBox();
            assert.ok(banner.x>=0&&banner.x+banner.width<=width+1);
        }
        assert.equal(await page.locator('.dashboard-header button').count(),1);
        const form=await page.locator('#search-form').boundingBox();
        const submit=await page.locator('.search-button').boundingBox();
        assert.ok(submit.x>=form.x&&submit.x+submit.width<=form.x+form.width,'search action stays inside field');
        assert.ok((await page.locator('#search-input').boundingBox()).width>=100);
        assert.equal(await page.locator('.bookmark-card').evaluate(e => e.scrollWidth<=e.clientWidth+1),true);
        if(width===390||width===1440) await page.screenshot({path:`test-artifacts/home-refreshed-${width}.png`});
    }
    await page.locator('[aria-label="Quickパネル"]').click();
    assert.equal(await page.locator('.settings-body > :first-child').evaluate(e=>e.classList.contains('settings-category-tabs')),true);
    await require('./helpers/browser.cjs').quickDetails(page,'appearance');
    await page.locator('[data-ui-mode=light]').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#settings-panel').classList.contains('active'));
    await page.locator('#settings-panel').waitFor({state:'hidden'});
    await page.screenshot({path:'test-artifacts/home-refreshed-light.png'});
    assert.equal(await page.locator('[data-cc=dashboard-edit],#cc-dashboard-editor').count(),0);
    console.log('PASS: compact top Festival, bounded Quick access/search, navigation-first settings and fixed home layout');
}).catch(error => {console.error(error);process.exitCode=1;});
