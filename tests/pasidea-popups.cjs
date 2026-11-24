const assert=require('node:assert/strict');
const {withApp}=require('./helpers/browser.cjs');
withApp(async(page)=>{
 for(const theme of ['light','dark']){
  await page.evaluate(async mode=>(await import('./js/ui-system.js?v=14.0.0')).applyUISystemPreferences({colorMode:mode}),theme);
  for(const width of [1440,768,375,320]){
   await page.setViewportSize({width,height:900});
   await require('./helpers/browser.cjs').quickTile(page,'studio');
   const dialog=page.locator('#mini-app-dialog');
   await page.frameLocator('#mini-app-dialog iframe').locator('.mini-app-card').first().waitFor();
   await dialog.evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{})));});
   const box=await dialog.boundingBox();
   assert.ok(Math.abs(box.x)<1&&Math.abs(box.width-width)<1,'Studio fills viewport '+JSON.stringify({width,box}));
   assert.ok(Math.abs(box.y)<1&&Math.abs(box.height-900)<1,'Studio fills viewport height');
   assert.equal(await dialog.evaluate(n=>getComputedStyle(n).borderRadius),'0px');
   const close=dialog.locator(':scope > header .pasidea-close-btn');
   assert.equal(await close.isVisible(),true);
   const cb=await close.boundingBox();assert.equal(cb.width,48);assert.equal(cb.height,48);
   assert.ok(cb.x>=box.x&&cb.x+cb.width<=box.x+box.width,'close stays inside dialog');
   assert.match(await page.frameLocator('#mini-app-dialog iframe').locator('.mini-app-card strong').first().evaluate(n=>getComputedStyle(n).fontFamily),/Inter/);
   const cards=page.frameLocator('#mini-app-dialog iframe').locator('.mini-app-card');
   assert.equal(await cards.first().evaluate(n=>getComputedStyle(n).borderRadius),'16px');
   assert.equal(await cards.first().locator('strong').evaluate(n=>getComputedStyle(n).fontSize),'17px');
   assert.equal(await page.frameLocator('#mini-app-dialog iframe').locator('html').evaluate(n=>n.scrollWidth<=innerWidth+1),true,'embedded content overflow');
   if(width===320)await page.screenshot({path:`test-artifacts/pasidea-popup-${theme}-320.png`});
   await close.click();await dialog.waitFor({state:'detached'});
   assert.equal(new URL(page.url()).pathname,'/');
  }
 }
 await require('./helpers/browser.cjs').quickDetails(page,'appearance');
 await page.locator('#settings-panel').evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished.catch(()=>{})));});
 const settings=await page.locator('#settings-panel').boundingBox();
 assert.ok(settings.x>=15&&settings.x+settings.width<=305,'settings margins '+JSON.stringify(settings));
 await page.screenshot({path:'test-artifacts/pasidea-settings-final-320.png'});
 await page.keyboard.press('Escape');
 await page.locator('#home-messages-card').click();
 await page.frameLocator('#messages-dialog iframe').locator('#messages-login').waitFor();
 assert.equal(await page.frameLocator('#messages-dialog iframe').locator('.mini-header').count(),0);
 await page.frameLocator('#messages-dialog iframe').locator('body').press('Escape');
 await page.locator('#messages-dialog').waitFor({state:'detached'});
 assert.equal(new URL(page.url()).pathname,'/');
 console.log('PASS: popup margins, widths, corner radii, close bounds, iframe typography and Messages Escape across themes and 320/375/768/1440 widths');
}).catch(e=>{console.error(e);process.exitCode=1;});
