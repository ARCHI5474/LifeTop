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
        const banner=await page.locator('.festival-banner').boundingBox();
        const hero=await page.locator('.hero-section').boundingBox();
        assert.ok(banner.height<=190 && banner.y+banner.height<=hero.y,'compact Festival above clock/search');
        assert.equal(await page.locator('.dashboard-content > :first-child').getAttribute('class'),'festival-banner');
        const form=await page.locator('#search-form').boundingBox();
        const submit=await page.locator('.search-button').boundingBox();
        assert.ok(submit.x>=form.x&&submit.x+submit.width<=form.x+form.width,'search action stays inside field');
        assert.ok((await page.locator('#search-input').boundingBox()).width>=100);
        assert.equal(await page.locator('.bookmark-card').evaluate(e => e.scrollWidth<=e.clientWidth+1),true);
        if(width===390||width===1440) await page.screenshot({path:`test-artifacts/home-refreshed-${width}.png`});
    }
    await page.locator('[aria-label="Quickパネル"]').click();
    assert.equal(await page.locator('.settings-body > :first-child').evaluate(e=>e.classList.contains('settings-category-tabs')),true);
    await page.locator('#settings-tab-appearance').click();
    await page.locator('[data-ui-mode=light]').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#settings-panel').classList.contains('active'));
    await page.locator('#settings-panel').waitFor({state:'hidden'});
    await page.screenshot({path:'test-artifacts/home-refreshed-light.png'});
    await page.getByRole('button',{name:'ホームを編集',exact:true}).click();
    const panel=await page.locator('#cc-dashboard-editor').boundingBox();
    assert.ok(panel.x===0&&panel.y===0&&panel.width===1440&&panel.height===900);
    await page.getByRole('button',{name:'ホーム編集を閉じる',exact:true}).click();
    console.log('PASS: compact top Festival, bounded Quick access/search, navigation-first settings and fullscreen home editor');
}).catch(error => {console.error(error);process.exitCode=1;});
