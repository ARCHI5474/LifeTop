const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const {createRequire}=require('node:module');const {chromium}=createRequire(process.env.PLAYWRIGHT_MODULE_PATH||require.resolve('playwright'))('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
 const page=await browser.newPage();const errors=[],issues=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://lifetop.test')return route.abort();const f=path.resolve(__dirname,'..','.'+(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await fs.readFile(f),contentType:f.endsWith('.ttf')?'font/ttf':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'});}catch{await route.fulfill({status:404,body:''});}});
 await page.goto('http://lifetop.test');await page.locator('#loading-screen').waitFor({state:'detached'});
 await page.evaluate(()=>document.fonts.load('24px "LifeTop Material Symbols"'));
 assert.equal(await page.evaluate(()=>document.fonts.check('24px "LifeTop Material Symbols"')),true);
 assert.equal(await page.locator('.dashboard-header #weather-widget').count(),0);
 assert.equal(await page.locator('.weather-summary-row #weather-widget').count(),1);
 for(const selector of ['#weather-icon','#user-badge .user-avatar']){const r=await page.locator(selector).boundingBox();assert.ok(Math.abs(r.width-r.height)<.1,'square icon slot: '+selector);}
 const card=await page.locator('.glass-card').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 assert.equal(await page.locator('#user-badge').evaluate(e=>getComputedStyle(e).backgroundColor),card);
 await page.getByRole('button',{name:'ユーザープロフィールを開く'}).click();assert.equal(await page.locator('[data-profile-icon=person]').evaluate(e=>getComputedStyle(e,'::after').content),'none');
 await page.locator('#username-input').fill('長い名前でも丸い画像を維持します');
 await page.locator('#profile-icon-upload').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5XkAAAAASUVORK5CYII=','base64')});
 await page.waitForFunction(()=>document.querySelector('#user-badge img'));
 await page.keyboard.press('Escape');
 const image=await page.locator('#user-badge img').boundingBox();assert.ok(Math.abs(image.width-image.height)<.1,'uploaded profile photo remains square before circular crop');
 for(const [width,height]of [[320,568],[320,740],[390,844],[600,900],[768,1024],[1440,1000],[740,360]]){
  if(process.env.LAYOUT_WIDTH&&width!==Number(process.env.LAYOUT_WIDTH))continue;
  await page.setViewportSize({width,height});await page.locator('#game-open-btn').click();await page.waitForTimeout(450);
  const compact=await page.locator('#gamebox-select').isVisible();
  assert.match(await page.locator('#game-modal-title').innerText(),/GameBox/);
  if(compact){
   assert.equal(await page.locator('#gamebox-select option').count(),9);
   await page.locator('#gamebox-select').selectOption('lights');
   assert.equal(await page.locator('[data-game-pane=lights]').isVisible(),true);
   await page.locator('#gamebox-select').selectOption('snake');
  }else{
  await page.locator('.game-tab-btn.active').focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-game-tab=lights]').getAttribute('aria-selected'),'true');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-game-tab=snake]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.game-tab-btn[tabindex="0"]').count(),1);
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('Home');
  assert.equal(await page.locator('[data-game-tab=snake]').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('.game-tab-btn .material-symbols-outlined').count(),9);
  assert.equal(await page.locator('.game-tab-btn > span:not(.material-symbols-outlined)').evaluateAll(nodes=>nodes.length===9&&nodes.every(n=>{const r=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=b.left&&r.right<=b.right+1&&r.bottom<=b.bottom+1&&getComputedStyle(n).visibility==='visible';})),true,'all game names are visible inside their tabs');
  assert.equal(await page.locator('.game-tab-btn .material-symbols-outlined').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).display!=='none')),true,'all game icons visible');
  }
  for(const game of ['snake','puzzle','othello','go','shogi','hitblow','tictactoe','memory','lights']){
   if(compact)await page.locator('#gamebox-select').selectOption(game);
   else await page.locator('[data-game-tab='+game+']').click();
   assert.equal(await page.locator('#gamebox-select').inputValue(),game,'desktop and compact selectors stay synchronized');
   if(game==='hitblow'){for(let i=0;i<10;i++){if(await page.locator('#hit-input').isDisabled())break;await page.locator('#hit-input').fill('0123');await page.locator('#hit-submit').click();}}
   const found=await page.evaluate(()=>{
    const selectors=['.game-modal-card','.game-modal-body','.game-pane.active','.game-pane.active .game-sidebar','.game-pane.active .game-stage-wrap','.game-pane.active .hit-history'];
    const problems=[];for(const s of selectors){const e=document.querySelector(s);if(e&&e.scrollHeight>e.clientHeight+2)problems.push({s,h:e.clientHeight,scroll:e.scrollHeight});}
    const pane=document.querySelector('.game-pane.active'),r=pane.getBoundingClientRect();for(const e of pane.querySelectorAll('button,input')){const b=e.getBoundingClientRect();if(b.width&&b.height&&(b.bottom>r.bottom+2||b.right>r.right+2||b.left<r.left-2||b.top<r.top-2))problems.push({control:e.id||e.className,bottom:b.bottom,right:b.right,paneBottom:r.bottom,paneRight:r.right});}
    return problems;
   });if(found.length)issues.push({width,height,game,found});
   await page.waitForTimeout(180);
   if(process.env.REVIEW_SCREENSHOT&&width===390&&['snake','shogi','hitblow'].includes(game))await page.screenshot({path:process.env.REVIEW_SCREENSHOT+'-'+game+'.png'});
   if(process.env.REVIEW_SCREENSHOT&&width===740&&game==='othello')await page.screenshot({path:process.env.REVIEW_SCREENSHOT+'-landscape.png'});
   await page.getByRole('button',{name:'遊び方を表示'}).click();assert.ok(await page.locator('#game-rules-text').innerText());await page.keyboard.press('Escape');assert.equal(await page.locator('#game-modal').evaluate(e=>e.classList.contains('active')),true,'closing instructions keeps game open');
  }
  await page.keyboard.press('Escape');await page.waitForTimeout(250);
 }
 assert.deepEqual(issues,[],'all boards and controls fit without game-window scrolling');assert.deepEqual(errors,[]);
 console.log('PASS: official font, square icon/avatar frames, matching colors, no profile checkmark, 9 labeled game icons, no game scrolling at 7 viewport sizes, full guess history, instructions');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
