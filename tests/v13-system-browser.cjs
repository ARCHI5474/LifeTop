const assert=require('node:assert/strict');
const {withApp,selectGame}=require('./helpers/browser.cjs');
withApp(async(page,context)=>{
 const requests=[];context.on('request',r=>requests.push(r.url()));
 assert.equal(await page.locator('.dashboard-header button').count(),1);
 assert.equal(await page.locator('.dashboard-header #user-badge').count(),0);
 assert.equal(await page.locator('#home-horoscope-card').count(),0);
 assert.match((await page.locator('.app-footer').textContent()).trim(),/^LifeTop\s+v13\.0$/);
 await page.locator('#live-home-canvas').waitFor({state:'attached'});
 await page.locator('[aria-label="Quickパネル"]').click();
 assert.equal(await page.locator('#quick-tiles button').count(),9);
 await page.locator('[data-quick-tile="theme"]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#quick-edit').click();await page.getByRole('switch',{name:'カメラを表示',exact:true}).click();await page.locator('#quick-edit').click();
 assert.equal(await page.locator('[data-quick-tile="camera"]').count(),0);
 await page.locator('#quick-edit').click();await page.getByRole('switch',{name:'カメラを表示',exact:true}).click();await page.locator('#quick-edit').click();
 for(const mode of ['light','dark']){
  if(await page.locator('html').getAttribute('data-theme')!==mode)await page.locator('[data-quick-tile="theme"]').click();
  const contrast=await page.locator('body').evaluate(body=>{
   const s=getComputedStyle(body),rgb=name=>{let h=s.getPropertyValue(name).trim().slice(1);if(h.length===3)h=[...h].map(c=>c+c).join('');return h.match(/../g).map(c=>parseInt(c,16));};
   const lum=values=>values.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
   return ['--ui-text','--ui-text-muted','--ui-primary'].map(name=>{const fg=lum(rgb(name)),bg=lum(rgb('--ui-surface').map(c=>c*.88+(body.dataset.theme==='dark'?255:0)*.12));return{name,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};});
  });
  for(const color of contrast)assert.ok(color.ratio>=4.5,mode+' '+JSON.stringify(color));
  for(const [width,height]of [[320,568],[390,844],[768,900],[844,350],[1440,1000]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(250);
   const b=await page.locator('#quick-panel').boundingBox();assert.ok(b.y>=0&&b.x>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,JSON.stringify({b,width,height}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   if(width===390||width===1440)await page.screenshot({path:`test-artifacts/v13-quick-${mode}-${width}.png`});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-quick-tile=settings]').click();
 await page.locator('#settings-tab-appearance').click();await page.locator('#live-home-enabled').uncheck();await page.locator('#live-home-enabled').check();
 await page.keyboard.press('Escape');await page.locator('#settings-panel').waitFor({state:'hidden'});
 await page.screenshot({path:'test-artifacts/v13-home.png'});
 await page.locator('[aria-label="Quickパネル"]').click();await page.locator('[data-quick-tile="files"]').click();await page.locator('#cc-dialog').waitFor();await page.keyboard.press('Escape');await page.locator('#cc-dialog').waitFor({state:'detached'});
 await page.locator('[aria-label="Quickパネル"]').click();await page.locator('[data-quick-tile="studio"]').click();await page.frameLocator('#mini-app-dialog iframe').locator('.mini-app-card').first().waitFor();
 await page.locator('#mini-app-dialog [data-cancel]').click();await page.locator('#mini-app-dialog').waitFor({state:'detached'});
 await page.locator('[aria-label="Quickパネル"]').click();await page.locator('#user-badge').click();await page.locator('#username-input').waitFor();
 await page.keyboard.press('Escape');await page.locator('#settings-panel').waitFor({state:'hidden'});
 assert.equal(requests.some(url=>/astroway|horoscope/.test(url)),false);
 console.log('PASS: centered Quick handle, top sheet at 320–1440px/landscape, editable tiles, account/files/Studio actions, light/dark, Live home and minimal footer; no horoscope');
}).catch(error=>{console.error(error);process.exitCode=1;});
