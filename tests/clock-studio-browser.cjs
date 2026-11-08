const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {withApp}=require('./helpers/browser.cjs');

withApp(async(page,context)=>{
    assert.equal(await page.locator('.trends-subtitle').count(),0);
    await page.locator('[aria-label="Quickパネル"]').click();
    await page.locator('#settings-tab-clock').click();
    assert.equal(await page.locator('#clock-designs button').count(),6);
    assert.equal(await page.locator('#font-styles').count(),0);
    const designs=await page.locator('#clock-designs button').evaluateAll(nodes=>nodes.map(n=>n.dataset.clockDesign));
    await page.locator('#settings-tab-advanced').click();
    await page.locator('.advanced-settings summary').click();
    await page.locator('#clock-show-sec-toggle').check();
    await page.locator('#settings-tab-clock').click();
    for(const design of designs){
        await page.locator(`[data-clock-design="${design}"].clock-design-option`).click();
        assert.equal(await page.locator('body').getAttribute('data-clock-design'),design);
        await page.keyboard.press('Escape');
        await page.locator('#settings-panel').waitFor({state:'hidden'});
        for(const width of [320,1440]){
            await page.setViewportSize({width,height:1000});
            const positions=await page.evaluate(async()=>{
                const {updateClock}=await import('/js/clock.js?v=9.0');
                const {userConfig}=await import('/js/config.js?v=9.0');
                const old12h=userConfig.clock12h;
                const OriginalDate=Date,results=[];
                try{
                    for(const mode of [false,true])for(const [h,m,s] of [[0,0,0],[1,11,11],[11,59,59],[12,0,0],[23,59,59]]){
                        userConfig.clock12h=mode;
                        window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[2026,10,8,h,m,s]));}};
                        updateClock();
                        results.push(['.hero-section','.clock-composition','#clock-sec','#search-form','.weather-summary-row'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
                    }
                }finally{window.Date=OriginalDate;userConfig.clock12h=old12h;updateClock();}
                return results;
            });
            for(const position of positions)assert.deepEqual(position,positions[0],`stable clock layout: ${design} ${width}`);
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
            if(width===1440)await page.locator('.hero-section').screenshot({path:`test-artifacts/clock-design-${design}.png`});
        }
        await page.locator('[aria-label="Quickパネル"]').click();
        await page.locator('#settings-tab-clock').click();
    }
    await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});
    assert.equal(await page.locator('body').getAttribute('data-clock-design'),'blueprint');
    await page.goto('http://localhost/mini-apps.html');
    await page.locator('.mini-app-card').first().waitFor();
    assert.deepEqual(await page.locator('.mini-app-card strong').allTextContents(),['StoneTXT','BlockSheet','SlideSpark','LineNote','FutureDraw','ChangePosition','PaisdeaBrowser（β版）','PasideaCode（β版）']);
    await page.screenshot({path:'test-artifacts/studio-eight-apps.png'});
    await page.locator('[data-app=document]').click();await page.locator('#editor').fill('StoneTXTの文書');
    const open=async id=>{await page.locator('#mini-picker').selectOption(id);await page.waitForFunction(id=>location.hash==='#'+id,id);};
    await open('diary');await page.locator('#diary-date').fill('2026-11-01');await page.locator('#diary-text').fill('一日目の日記');
    await page.locator('#diary-date').fill('2026-11-02');await page.locator('#diary-text').fill('二日目の日記');
    await page.evaluate(()=>window.flushMiniApp());await page.reload();await page.locator('#diary-text').waitFor();
    assert.equal(await page.locator('#diary-text').inputValue(),'二日目の日記');
    await page.locator('#diary-list').getByRole('button',{name:'2026-11-01'}).click();assert.equal(await page.locator('#diary-text').inputValue(),'一日目の日記');
    await page.locator('#studio-workspace-save').click();await page.locator('#mini-status').filter({hasText:'ファイル一覧に保存しました'}).waitFor();
    await open('convert');await page.locator('#convert-file').setInputFiles({name:'rows.csv',mimeType:'text/csv',buffer:Buffer.from('name,value\nA,2')});
    await page.locator('#convert-format').selectOption('json');
    let downloading=page.waitForEvent('download');await page.locator('#convert-run').click();const downloaded=await downloading;
    assert.deepEqual(JSON.parse(await fs.readFile(await downloaded.path(),'utf8')),[['name','value'],['A','2']]);
    await open('code');await page.locator('#code-source').fill('<h1>PasideaCode preview</h1>');await page.locator('#code-preview-button').click();
    await page.frameLocator('#code-preview').getByRole('heading',{name:'PasideaCode preview'}).waitFor();
    assert.equal(await page.locator('#code-preview').getAttribute('sandbox'),'allow-scripts');
    await page.locator('#code-language').selectOption('json');await page.locator('#code-source').fill('{"value":2}');await page.locator('#code-format').click();assert.match(await page.locator('#code-source').inputValue(),/\n  "value": 2/);
    await open('browser');await page.locator('#browser-address').fill('javascript:alert(1)');await page.locator('#browser-form button[type=submit]').click();
    await page.locator('#mini-status').filter({hasText:'HTTPまたはHTTPS'}).waitFor();
    await context.route('https://example.test/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Browser fixture</h1>'}));
    await page.locator('#browser-address').fill('https://example.test/');await page.locator('#browser-form button[type=submit]').click();await page.frameLocator('#studio-browser-frame').getByRole('heading',{name:'Browser fixture'}).waitFor();
    assert.equal(await page.locator('#browser-external').getAttribute('href'),'https://example.test/');
    await page.evaluate(()=>window.flushMiniApp());await page.goto('http://localhost/mini-apps.html#compare');await page.locator('#diff-run').waitFor();
    for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
    console.log('PASS: six persisted clock designs without tick layout shifts, eight Studio apps, diary persistence/file save, CSV conversion, isolated code/browser previews and legacy app compatibility');
}).catch(error=>{console.error(error);process.exitCode=1;});
