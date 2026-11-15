const assert=require('node:assert/strict');
const {withApp,openQuick,quickDetails,quickTile}=require('./helpers/browser.cjs');
withApp(async(page)=>{
 await page.evaluate(async()=>{
  const timestamp=Date.now();localStorage.setItem('lifetop_news_cache_v2',JSON.stringify({top:{timestamp,items:[{title:'検証ニュース',url:'https://example.test/news',source:'確認',pubDate:new Date().toISOString()}]}}));localStorage.setItem('lifetop_trends_cache_v1',JSON.stringify({jp:{timestamp,items:[{keyword:'検証ワード',url:'https://example.test/word'}]}}));await window.refreshNews();await window.refreshTrends();
 });
 assert.match(await page.locator('#news-status-text').textContent(),/^\d{1,2}時\d{2}分取得$/);assert.equal(await page.locator('#news-status-text').textContent(),await page.locator('#trends-status-text').textContent());
 await page.evaluate(async()=>{await window.refreshNews(true);await window.refreshTrends(true);});assert.match(await page.locator('#news-status-text').textContent(),/^\d{1,2}時\d{2}分取得$/);
 const defaults=['theme','live','studio','files','camera','screensaver','eggs','memories','settings'];
 await openQuick(page);assert.deepEqual(await page.locator('#quick-tiles button').evaluateAll(nodes=>nodes.map(n=>n.dataset.quickTile)),defaults);
 assert.equal(await page.locator('#settings-panel').isVisible(),false);
 await page.locator('#quick-edit').click();assert.equal(await page.locator('#quick-tiles').isVisible(),false);
 await page.getByRole('switch',{name:'カメラを表示',exact:true}).click();await page.locator('#quick-edit').click();assert.equal(await page.locator('[data-quick-tile=camera]').count(),0);
 await page.locator('#quick-edit').click();await page.getByRole('switch',{name:'カメラを表示',exact:true}).click();await page.getByRole('button',{name:'設定を上へ',exact:true}).click();await page.locator('#quick-edit').click();
 for(const [width,height]of[[320,568],[390,844],[844,350],[1440,1000]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);const b=await page.locator('#quick-panel').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1);if(width===1440)assert.ok(b.width>=720,'desktop Quick must not inherit the old narrow settings width');
  await page.locator('#quick-edit').click();for(const row of await page.locator('.quick-edit-row').all()){const b=await row.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);}await page.screenshot({path:`test-artifacts/v13-quick-editor-${width}.png`});await page.locator('#quick-edit').click();
 }
 await page.locator('[data-quick-tile=settings]').click();await page.locator('#quick-panel').waitFor({state:'hidden'});assert.equal(await page.locator('#settings-title').textContent(),'設定');
 await page.locator('#settings-tab-appearance').click();assert.equal(await page.locator('#bg-presets button').count(),10);assert.equal(await page.locator('#color-combos button').count(),30);
 await page.locator('#bg-presets button').nth(8).click();assert.equal(await page.locator('#live-home-enabled').isChecked(),false);assert.match(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--bg-gradient')),/quiet-dunes/);
 for(const name of ['quiet-dunes','paper-garden'])assert.equal(await page.evaluate(async name=>{const image=new Image();image.src='assets/wallpapers/'+name+'.svg';await image.decode();return image.naturalWidth;},name),2400);
 await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});assert.match(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--bg-gradient')),/quiet-dunes/);
 await quickDetails(page,'clock');assert.equal(await page.locator('#clock-designs button').count(),10);await page.screenshot({path:'test-artifacts/v13-clock-picker.png'});await page.keyboard.press('Escape');
 const designs=await page.evaluate(async()=> (await import('/js/config.js?v=13.0.1')).clockDesigns.map(d=>d.id));
 for(const mode of ['light','dark'])for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(async mode=>(await import('/js/ui-system.js?v=13.0.1')).applyUISystemPreferences({colorMode:mode}),mode);
  for(const design of designs){await page.evaluate(id=>window.setClockDesign(id),design);assert.equal(await page.locator('body').getAttribute('data-clock-design'),design);const r=await page.locator('#clock').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width+1,design+' '+width+' '+JSON.stringify(r));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);if(width===390&&mode==='dark')await page.screenshot({path:`test-artifacts/clock-${design}-390.png`});}
 }
 await quickTile(page,'screensaver');await page.locator('#screensaver-dialog').waitFor();assert.match(await page.locator('.saver-time').textContent(),/\d\d:\d\d/);await page.locator('#screensaver-dialog').evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{})));});await page.screenshot({path:'test-artifacts/v13-screensaver.png'});await page.keyboard.press('Escape');await page.locator('#screensaver-dialog').waitFor({state:'detached'});
 await quickTile(page,'eggs');await page.locator('#egg-logs-dialog .egg-log-list li').first().waitFor();await page.keyboard.press('Escape');await page.locator('#egg-logs-dialog').waitFor({state:'detached'});
 await page.setViewportSize({width:320,height:844});await page.locator('#edit-bookmarks-btn').click();
 for(const row of await page.locator('.bookmark-card.edit-mode .bookmark-item-wrapper').all()){
  const main=await row.locator('.bookmark-item').boundingBox(),bar=await row.locator('.bookmark-edit-bar').boundingBox(),del=await row.locator('.bookmark-delete-btn').boundingBox();assert.ok(bar.y>=main.y+main.height-1);assert.ok(del.x>=main.x+main.width-1);assert.ok(bar.x+bar.width<=320);
 }
 await page.screenshot({path:'test-artifacts/quick-access-edit-320.png'});
 console.log('PASS: independent settings; nine Quick defaults; switches, ordering and persistence; 10 clocks across themes/widths; 10 wallpapers/30 combos; screensaver/Logs; Quick Access non-overlapping editing');
}).catch(e=>{console.error(e);process.exitCode=1;});
