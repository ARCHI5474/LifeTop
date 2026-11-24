const assert = require('node:assert/strict');
const {withApp} = require('./helpers/browser.cjs');
withApp(async page => {
 for (const route of ['/', '/mini-apps.html', '/messages.html', '/festival.html']) {
  await page.goto('http://localhost'+route);
  await page.locator('body.ui-system').waitFor();
  for (const theme of ['light','dark']) {
   await page.evaluate(async mode => {
    const {applyUISystemPreferences}=await import('./js/ui-system.js?v=14.0.0');
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
 await page.goto('http://localhost/festival.html');
 await page.locator('#festival-period').filter({hasText:/終了|開催中|開催前/}).waitFor();
 if((await page.locator('#festival-period').textContent()).includes('終了'))assert.equal(await page.locator('#festival-activities').isVisible(),false);
 await page.goto('http://localhost/');
 const close=page.locator('#settings-panel .close-action').first();
 const style=await close.evaluate(n=>{const s=getComputedStyle(n);return [s.width,s.height,s.borderRadius];});
 assert.deepEqual(style,['48px','48px','16px']);
 await page.evaluate(()=>{const b=document.createElement('button');b.id='pasidea-disabled';b.disabled=true;b.textContent='disabled';document.body.append(b);});
 assert.equal(await page.locator('#pasidea-disabled').evaluate(n=>getComputedStyle(n).opacity),'0.45');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:'test-artifacts/pasidea-home-320.png',fullPage:false});
 for (const mode of ['light','dark']) {
  await page.evaluate(colorMode=>localStorage.setItem('lifetop_v1_0_data',JSON.stringify({theme:'#2E8B72',colorMode})),mode);
  for (const [route,selector,token] of [
   ['/','.search-button','--ui-primary'],
   ['/messages.html','#messages-connect','--ui-primary'],
   ['/festival.html','.festival-heading','--ui-primary-soft']
  ]) {
   await page.goto('http://localhost'+route);
   await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--ui-accent-override'));
   const pair=await page.locator(selector).first().evaluate((node,token)=>{
    const probe=document.createElement('i');
    probe.style.backgroundColor='var('+token+')';
    document.body.append(probe);
    const pair=[getComputedStyle(node).backgroundColor,getComputedStyle(probe).backgroundColor];
    probe.remove();
    return pair;
   },token);
   assert.equal(pair[0],pair[1],mode+' '+route+' '+selector);
  }
 }
 const failures = await page.evaluate(async () => {
  const {colorCombos} = await import('/js/config.js?v=14.0.0');
  const {applyUISystemPreferences} = await import('/js/ui-system.js?v=14.0.0');
  const {contrastRatio} = await import('/js/color-palette.js?v=14.0.0');
  const failures = [];
  for (const colorMode of ['light','dark']) for (const combo of colorCombos) {
   applyUISystemPreferences({...combo,colorMode});
   const style = getComputedStyle(document.body);
   const color = key => style.getPropertyValue('--ui-'+key).trim();
   for (const [foreground,background,minimum] of [
    ['on-primary','primary',4.5], ['on-primary','primary-hover',4.5], ['on-primary','primary-pressed',4.5],
    ['on-primary-soft','primary-soft',4.5], ['text','bg',4.5], ['text-muted','surface-muted',4.5],
    ['focus','surface-muted',3], ['control-border','surface-muted',3]
   ]) {
    const ratio=contrastRatio(color(foreground),color(background));
    if (!(ratio>=minimum)) failures.push({combo:combo.name,colorMode,foreground,background,ratio});
   }
  }
  return failures;
 });
 assert.deepEqual(failures,[]);
 console.log('PASS: Pasidea palettes, controls and responsive layouts across all four pages');
}).catch(e=>{console.error(e);process.exitCode=1;});
