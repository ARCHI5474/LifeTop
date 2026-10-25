const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire(process.env.PLAYWRIGHT_MODULE_PATH||require.resolve('playwright'))('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://lifetop.test')return route.abort();const f=path.resolve(__dirname,'..','.'+(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await fs.readFile(f),contentType:f.endsWith('.ttf')?'font/ttf':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html'});}catch{await route.fulfill({status:404,body:''});}});
await page.goto('http://lifetop.test');await page.locator('#loading-screen').waitFor({state:'detached'});
const remaining=await page.locator('.material-symbols-outlined').evaluateAll(nodes=>nodes.filter(n=>/^[a-z_]+$/.test(n.textContent.trim())).map(n=>n.textContent.trim()));
assert.deepEqual(remaining,[],'all UI icons resolve to official Material glyphs');
const unnamed = await page.locator('button').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.title&&!e.textContent.trim()).map(e=>e.outerHTML));
assert.deepEqual(unnamed,[],'visible buttons have accessible names');
await page.locator('#search-input').fill('動作確認');
await page.evaluate(()=>document.querySelector('#search-form').addEventListener('submit',e=>{e.preventDefault();window.lastSearch=new URLSearchParams(new FormData(e.target)).toString();}));
await page.locator('#search-input').press('ArrowDown');await page.locator('#search-input').press('Enter');
assert.ok(await page.evaluate(()=>window.lastSearch?.includes('q=')));
await page.locator('#search-clear-btn').click();assert.equal(await page.locator('#search-input').inputValue(),'');
await page.locator('#game-open-btn').click();await page.keyboard.press('/');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'search-input','game modal owns keyboard');
await page.getByRole('tab',{name:'オセロ',exact:true}).click();
await page.locator('#othello-board .is-playable').first().click();
await page.evaluate(()=>window.initOthelloGame());await page.waitForTimeout(450);
assert.equal(await page.locator('#othello-black-count').innerText(),'2');assert.equal(await page.locator('#othello-white-count').innerText(),'2','old AI result cannot mutate a new game');
await page.keyboard.press('Escape');
await page.locator('.add-bookmark-btn').first().click();
await page.locator('#bookmark-title-input').fill('監査テストサイト');await page.locator('#bookmark-url-input').fill('javascript:alert(1)');
await page.locator('#bookmark-dialog button[type=submit]').click();
assert.equal(await page.locator('#bookmark-url-input').getAttribute('aria-invalid'),'true');
assert.ok(await page.locator('#bookmark-dialog-error').innerText());
await page.locator('#bookmark-url-input').fill('example.com');await page.locator('#bookmark-dialog button[type=submit]').click();
assert.equal(await page.locator('#bookmark-grid a').filter({hasText:'監査テストサイト'}).getAttribute('href'),'https://example.com/');
await page.evaluate(()=>window.openFolderDialog());await page.locator('#bookmark-title-input').fill('監査テストフォルダ');await page.locator('#bookmark-dialog button[type=submit]').click();
await page.locator('.bookmark-folder-item').filter({hasText:'監査テストフォルダ'}).click();
assert.ok(await page.locator('.folder-back-btn').isVisible());await page.locator('.folder-back-btn').click();
await page.locator('[data-tab=memo]').click();await page.locator('#memo-editor').fill('監査メモを保存');
await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});await page.locator('[data-tab=memo]').click();assert.equal(await page.locator('#memo-editor').innerText(),'監査メモを保存');
await page.getByRole('button',{name:'Quickパネル',exact:true}).click();
await page.locator('#username-input').dispatchEvent('keydown',{key:'Escape',isComposing:true});assert.equal(await page.locator('#settings-panel').evaluate(e=>e.classList.contains('active')),true,'IME Escape does not close settings');
await page.keyboard.press('Escape');
await page.locator('#weather-widget').click();assert.equal(await page.locator('#weather-detail-modal').evaluate(e=>e.inert),false);
assert.ok(await page.locator('#weather-detail-content').innerText());
await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('#weather-detail-modal').contains(document.activeElement)));
await page.keyboard.press('Escape');await page.waitForTimeout(240);
assert.equal(await page.locator('#weather-detail-modal').evaluate(e=>getComputedStyle(e).visibility),'hidden');
// Sample real animation frames and exercise interruptions, rather than testing only the end state.
const frames=await page.evaluate(async()=>{
 const samples=[];window.openBookmarkDialog();let previous=performance.now();
 const end=previous+480;while(performance.now()<end){await new Promise(requestAnimationFrame);const now=performance.now();const s=getComputedStyle(document.querySelector('.popup-modal-card'));samples.push({dt:now-previous,y:new DOMMatrix(s.transform).m42,opacity:Number(s.opacity)});previous=now;}
 window.closeBookmarkDialog();return samples;
});
assert.ok(new Set(frames.map(f=>f.y.toFixed(2))).size>4,'popup is interpolated across frames');
assert.ok(frames.some(f=>f.y<0),'popup has a bounded bounce');
assert.ok(Math.abs(frames.at(-1).y)<.1,'popup settles exactly');
await page.waitForTimeout(240);
for(let i=0;i<4;i++){await page.evaluate(()=>window.openBookmarkDialog());await page.waitForTimeout(65);await page.evaluate(()=>window.closeBookmarkDialog());await page.waitForTimeout(65);}
await page.evaluate(()=>window.openBookmarkDialog());await page.waitForTimeout(450);
assert.equal(await page.locator('#bookmark-dialog').evaluate(e=>getComputedStyle(e).visibility),'visible');
assert.equal(await page.locator('#bookmark-dialog').evaluate(e=>e.inert),false);
await page.keyboard.press('Escape');await page.waitForTimeout(240);
assert.equal(await page.locator('#bookmark-dialog').evaluate(e=>getComputedStyle(e).visibility),'hidden');
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.openBookmarkDialog());
assert.equal(await page.locator('.popup-modal-card').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
// Contrast audit of labels and status text against composited ancestor surfaces.
await page.getByRole('button',{name:'Quickパネル',exact:true}).click();
const contrast=await page.evaluate(()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
 const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);};
 const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
 const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return [...document.querySelectorAll('#settings-panel label[for],#settings-panel .settings-help,#settings-panel legend,.header-user-name,.card-header h3,.news-status-text')].filter(e=>e.getClientRects().length).map(e=>{
  const stack=[];let n=e;while(n){stack.unshift(n);n=n.parentElement;}let bg=[16,20,25,1];for(const node of stack)bg=over(rgba(getComputedStyle(node).backgroundColor),bg);
  const fg=over(rgba(getComputedStyle(e).color),bg),a=lum(fg),b=lum(bg);return {text:e.textContent.trim().slice(0,35),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 }).filter(r=>r.text&&r.ratio<4.5);
});assert.deepEqual(contrast,[],'small label and status text meets 4.5:1 contrast on base surfaces');
if(process.env.REVIEW_SCREENSHOT){await page.waitForTimeout(450);await page.screenshot({path:process.env.REVIEW_SCREENSHOT+'-settings.png'});await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.setViewportSize({width:390,height:844});await page.screenshot({path:process.env.REVIEW_SCREENSHOT+'-mobile.png',fullPage:true});}
// Success-path weather data, independently of live network availability.
await page.evaluate(()=>{
 const now=new Date();now.setMinutes(0,0,0);const times=Array.from({length:25},(_,i)=>new Date(now.getTime()+i*3600000).toISOString().slice(0,16));
 const data={current_weather:{temperature:22,windspeed:10,weathercode:0,time:times[0],is_day:1},hourly:{time:times,temperature_2m:times.map(()=>22),relative_humidity_2m:times.map(()=>55),apparent_temperature:times.map(()=>23),precipitation_probability:times.map(()=>10),weathercode:times.map(()=>0)},daily:{temperature_2m_max:[25],temperature_2m_min:[17],uv_index_max:[4],sunrise:[times[0]],sunset:[times[12]]}};
 localStorage.setItem('lifetop_weather_cache_v1',JSON.stringify({data,lat:35,lon:139,timestamp:Date.now()}));
});
await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});
for(const width of [320,768,1440]){
 await page.setViewportSize({width,height:844});await page.locator('#weather-widget').click();await page.waitForTimeout(450);
 assert.equal(await page.locator('.weather-hourly-item').count(),8);
 assert.equal(await page.locator('.weather-modal-content').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,'weather fits '+width);
 assert.deepEqual(await page.locator('#weather-detail-modal .material-symbols-outlined').evaluateAll(nodes=>nodes.filter(n=>/^[a-z_]+$/.test(n.textContent.trim())).map(n=>n.textContent.trim())),[]);
 await page.keyboard.press('Escape');await page.waitForTimeout(240);
}
if(process.env.REVIEW_SCREENSHOT){await page.setViewportSize({width:390,height:844});await page.screenshot({path:process.env.REVIEW_SCREENSHOT+'-weather-summary.png',fullPage:true});}
assert.deepEqual(errors,[]);
const sorted=frames.map(f=>f.dt).sort((a,b)=>a-b);console.log('PASS: search/clear, modal keyboard/IME/focus, bookmark URL validation/folder/persistence, memo, stale Othello AI, interrupted bounce, reduced motion, icons and contrast');
console.log('Animation sample: '+frames.length+' frames, p95 interval '+sorted[Math.floor(sorted.length*.95)].toFixed(1)+'ms (this local browser; device performance varies).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
