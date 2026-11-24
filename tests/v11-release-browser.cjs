const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {withApp}=require('./helpers/browser.cjs');

withApp(async page=>{
    assert.equal(JSON.parse(await fs.readFile('package.json','utf8')).version,'14.0.0');
    assert.equal(JSON.parse(await fs.readFile('package-lock.json','utf8')).packages[''].version,'14.0.0');
    assert.match(await page.locator('.settings-about-version').textContent(),/v14\.0/);
    const release=await page.evaluate(async()=>{
        const config=await import('/js/config.js?v=14.0.0');
        const {createBackup}=await import('/js/data-management.js?v=14.0.0');
        const {festivalConfig}=await import('/js/festival-config.js?v=14.0.0');
        return {version:config.APP_VERSION,backup:JSON.parse(createBackup()).appVersion,start:festivalConfig.startAt,days:festivalConfig.durationDays};
    });
    assert.deepEqual(release,{version:'14.0.0',backup:'14.0.0',start:'2026-11-24T00:00:00+09:00',days:5});
    assert.equal(await page.locator('.festival-banner').count(),1);
    assert.match(await page.locator('.quick-tile .material-symbols-outlined').first().evaluate(e=>getComputedStyle(e).fontFamily),/LifeTop Material Symbols/);
    const welcome=page.locator('#festival-pop button');if(await welcome.isVisible())await welcome.click();
    for(const mode of ['light','dark']){
        await page.evaluate(async mode=>{
            const {userConfig}=await import('/js/config.js?v=14.0.0');
            const {applyStyles}=await import('/js/styles.js?v=14.0.0');
            const {applyUISystemPreferences}=await import('/js/ui-system.js?v=14.0.0');
            const canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;const g=canvas.getContext('2d');
            g.fillStyle='#f8e7c4';g.fillRect(0,0,400,500);g.fillStyle='#123047';g.fillRect(400,0,400,500);
            Object.assign(userConfig,{colorMode:mode,bgImage:canvas.toDataURL('image/png'),clockDesign:'digital'});applyStyles();applyUISystemPreferences(userConfig);
        },mode);
        await require('./helpers/browser.cjs').quickDetails(page,'appearance');await page.locator('#live-home-enabled').uncheck();await page.keyboard.press('Escape');
        assert.equal(await page.locator('.hero-section').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
        assert.equal(await page.locator('.clock-composition').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
        assert.equal(await page.locator('.hero-copy').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
        assert.equal(await page.locator('.clock-caption,.clock-day-track,.clock-day-labels').count(),0);
        assert.equal(await page.locator('#clock').evaluate(e=>getComputedStyle(e).webkitTextStrokeWidth),'3px');
        assert.match(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--bg-gradient')),/data:image\/png/);
        await page.setViewportSize({width:1440,height:1000});
        await page.locator('.hero-section').screenshot({path:`test-artifacts/v11-clock-wallpaper-${mode}.png`});
    }
    await page.goto('http://localhost/mini-apps.html?embedded=1');await page.locator('.mini-app-card').first().waitFor();
    for(const [width,height] of [[320,568],[375,812],[768,900],[1440,1000],[844,350]]){
        await page.setViewportSize({width,height});
        assert.equal(await page.locator('.mini-app-card:not([hidden])').count(),8);
        assert.equal(await page.locator('.studio-pager').count(),0);
        const descriptions=await page.locator('.mini-app-card > span').evaluateAll(nodes=>nodes.map(e=>({text:e.textContent.trim(),display:getComputedStyle(e).display,size:parseFloat(getComputedStyle(e).fontSize)})));
        assert.ok(descriptions.every(d=>d.text&&d.display!=='none'&&d.size>=12));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
        if(width===375||width===1440)await page.screenshot({path:`test-artifacts/v11-studio-all-${width}.png`,fullPage:true});
    }
    await page.locator('#mini-filter').fill('LineNote');assert.equal(await page.locator('.mini-app-card:not([hidden])').count(),1);
    await page.locator('#mini-filter').fill('');assert.equal(await page.locator('.mini-app-card:not([hidden])').count(),8);
    console.log('PASS: v14 metadata/backups and Festival schedule, retained Material Icons, visible wallpaper and all eight explained Studio apps across mobile/desktop/landscape');
}).catch(error=>{console.error(error);process.exitCode=1;});
