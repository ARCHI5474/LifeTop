const assert = require('node:assert/strict');
const {withApp} = require('./helpers/browser.cjs');
withApp(async page => {
 for (const route of ['/', '/mini-apps.html', '/messages.html', '/festival.html']) {
  await page.goto('http://localhost'+route);
  await page.locator('body.ui-system').waitFor();
  for (const theme of ['light','dark']) {
   await page.evaluate(async mode => {
    const {applyUISystemPreferences}=await import('./js/ui-system.js');
    applyUISystemPreferences({colorMode:mode});
   },theme);
   const palette=await page.locator('body').evaluate(n=>{const s=getComputedStyle(n);return {primary:s.getPropertyValue('--ui-primary').trim(),size:s.fontSize,bg:s.backgroundColor};});
   assert.equal(palette.primary,theme==='light'?'#2b5bb5':'#a8c7fa');
   assert.equal(palette.size,'15px');
   assert.equal(palette.bg,theme==='light'?'rgb(248, 249, 252)':'rgb(17, 19, 24)');
   for(const width of [1440,375,320]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,route+' '+theme+' '+width+' overflow');
   }
  }
 }
 await page.goto('http://localhost/');
 assert.equal(await page.locator('.hero-section').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
 assert.equal(await page.locator('.festival-banner').isVisible(),false);
 assert.equal(await page.locator('.festival-hidden-ten').count(),0);
 await page.goto('http://localhost/festival.html');
 await page.locator('#festival-period').filter({hasText:'イベントは終了しました。'}).waitFor();
 assert.equal(await page.locator('#festival-activities').isVisible(),false);
 await page.goto('http://localhost/');
 const close=page.locator('#settings-panel .close-action').first();
 const style=await close.evaluate(n=>{const s=getComputedStyle(n);return [s.width,s.height,s.borderRadius];});
 assert.deepEqual(style,['44px','44px','9999px']);
 await page.evaluate(()=>{const b=document.createElement('button');b.id='pasidea-disabled';b.disabled=true;b.textContent='disabled';document.body.append(b);});
 assert.equal(await page.locator('#pasidea-disabled').evaluate(n=>getComputedStyle(n).opacity),'0.45');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:'test-artifacts/pasidea-home-320.png',fullPage:false});
 console.log('PASS: Pasidea palettes, controls and responsive layouts across all four pages');
}).catch(e=>{console.error(e);process.exitCode=1;});
