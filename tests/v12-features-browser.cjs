const assert=require('node:assert/strict');
const {withApp}=require('./helpers/browser.cjs');
withApp(async(page)=>{
 await page.locator('[aria-label="Quickパネル"]').click();
 await require('./helpers/browser.cjs').quickDetails(page,'advanced');
 const memories=page.locator('[data-festival-memories]');await memories.click();
 await page.frameLocator('#festival-dialog iframe').locator('#festival-title').filter({hasText:'Memories'}).waitFor();
 assert.match(await page.locator('#settings-panel').textContent(),/不定期/);
 await page.locator('#festival-dialog [data-cancel]').click();await page.locator('#festival-dialog').waitFor({state:'detached'});
 const version=page.locator('.version-egg-trigger');for(let i=0;i<3;i++)await version.click();
 for(const light of await page.locator('.version-egg-light').all())await light.click();
 await page.locator('#version-egg-status').filter({hasText:'保存しました'}).waitFor();
 await page.locator('#version-egg-dialog [data-cancel]').click();await page.locator('#version-egg-dialog').waitFor({state:'detached'});
 await page.keyboard.press('Escape');await page.locator('#settings-panel').waitFor({state:'hidden'});
 await page.locator('#quick-links-open').click();
 assert.equal(await page.locator('.quick-link-row').count(),50);
 await page.locator('#quick-link-query').fill('Photopea');
 const row=page.locator('.quick-link-row').filter({hasText:'Photopea'}).first();
 await row.getByRole('button',{name:/ブックマークへピン留め/}).click();
 assert.equal(await row.locator('button').isDisabled(),true);
 await page.locator('#quick-link-query').fill('no-match-872094');assert.equal(await page.locator('.quick-link-row').count(),0);
 await page.locator('#quick-link-query').fill('');
 await page.locator('#quick-link-more').click();assert.equal(await page.locator('.quick-link-row').count(),100);
 for(const width of [1440,768,375,320]){
  await page.setViewportSize({width,height:900});const box=await page.locator('#quick-links-dialog').boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width,'catalog fits '+width);
  assert.equal(await page.locator('#quick-links-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  if(width===1440||width===375)await page.screenshot({path:`test-artifacts/v12-catalog-${width}.png`});
 }
 await page.locator('#quick-links-dialog [data-cancel]').click();await page.locator('#quick-links-dialog').waitFor({state:'detached'});
 await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});
 assert.equal(await page.locator('#bookmark-grid a').filter({hasText:'Photopea'}).count(),1);
 await page.evaluate(async()=>{
  const {switchBookmarkTab}=await import('./js/bookmarks.js?v=13.0.1');switchBookmarkTab('ニュース・新聞');
 });
 assert.ok(await page.locator('#bookmark-grid .bookmark-item').count()<=12);
 await page.locator('#bookmark-grid .quick-links-more').click();
 assert.equal(await page.locator('#quick-link-category').inputValue(),'ニュース・新聞');
 await page.keyboard.press('Escape');await page.locator('#quick-links-dialog').waitFor({state:'detached'});
 // Use an in-memory canvas stream; no physical camera or permission is used.
 await page.evaluate(()=>{
  window.cameraStops=0;window.cameraCalls=[];
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async constraints=>{
   cameraCalls.push(constraints);
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
   const ctx=canvas.getContext('2d');const timer=setInterval(()=>{ctx.fillStyle='#468abc';ctx.fillRect(0,0,320,240);},50);
   const stream=canvas.captureStream(20);
   for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{cameraStops++;clearInterval(timer);stop();};}
   return stream;
  }}});
 });
 assert.equal(await page.locator('[data-quick-tile=camera]').evaluate(n=>!!n.closest('#quick-tiles')),true);
 await require('./helpers/browser.cjs').quickTile(page,'camera');await page.locator('#camera-capture:not(:disabled)').waitFor();
 await page.locator('#camera-capture').click();await page.locator('#camera-photo:not([hidden]) img').waitFor();
 const download=page.waitForEvent('download');await page.locator('#camera-download').click();assert.match((await download).suggestedFilename(),/LifeTop-.*\.png/);
 await page.locator('#camera-switch').click();await page.locator('#camera-capture:not(:disabled)').waitFor();
 assert.equal(await page.evaluate(()=>cameraCalls.at(-1).video.facingMode.ideal),'environment');
 assert.equal(await page.evaluate(()=>cameraCalls.every(c=>c.audio===false)),true);
 await page.keyboard.press('Escape');await page.locator('#camera-dialog').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>cameraStops),2,'switch and close stop both streams');
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await require('./helpers/browser.cjs').quickTile(page,'camera');await page.locator('#camera-status').filter({hasText:'許可されていません'}).waitFor();
 assert.equal(await page.locator('#camera-retry').isVisible(),true);
 await page.keyboard.press('Escape');await page.locator('#camera-dialog').waitFor({state:'detached'});
 await page.evaluate(()=>{
  navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.resolveCamera=resolve;});
 });
 await require('./helpers/browser.cjs').quickTile(page,'camera');
 await page.waitForFunction(()=>typeof window.resolveCamera==='function');
 await page.keyboard.press('Escape');await page.locator('#camera-dialog').waitFor({state:'detached'});
 await page.evaluate(()=>{window.lateCameraStops=0;window.resolveCamera({getTracks:()=>[{stop:()=>lateCameraStops++}]});});
 await page.waitForFunction(()=>lateCameraStops===1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 console.log('PASS: FestivalMemories, v12 egg, 1000-link catalog, search/paging/pin persistence, camera capture/download/switch/cleanup and denial');
}).catch(error=>{console.error(error);process.exitCode=1;});
