const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const { chromium } = require('./helpers/browser.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});const errors=[],root=path.resolve(__dirname,'..');
async function fixture(now){const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});await context.addInitScript(({now})=>{window.__festivalNow=now;const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[window.__festivalNow]));}static now(){return window.__festivalNow;}};},{now});await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html'});}catch{await route.fulfill({status:404,body:''});}});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return context;}
try{
 const approved=Date.parse('2026-11-24T00:00:00+09:00'),c=await fixture(approved+60000),p=await c.newPage();
 await p.goto('http://localhost/');await p.locator('#loading-screen').waitFor({state:'detached'});
 await p.locator('.festival-banner').getByRole('heading',{name:'LifeTop14 Festival'}).waitFor();assert.match((await p.locator('.app-footer').textContent()).trim(),/^LifeTop\s+v14\.0$/);
 await p.locator('.festival-banner').getByRole('link',{name:'参加する'}).click();await p.frameLocator('#festival-dialog iframe').locator('#festival-ticket-content').waitFor();await p.locator('#festival-dialog [data-cancel]').click();await p.locator('#festival-dialog').waitFor({state:'detached'});
 await p.goto('http://localhost/festival.html?edition=10#memories');
 await p.getByRole('heading',{name:'v10 Festival Memories',exact:true}).waitFor();
 assert.equal(await p.locator('#festival-ticket-content').isHidden(),true);
 await p.evaluate(async()=>{
  const {updateFestival,issueTicket}=await import('/js/festival-model.js?v=14.0.0');
  await updateFestival(state=>issueTicket(state,Date.parse('2026-11-08T10:00:00+09:00'),()=>0));
 });
 await p.reload();
 await p.locator('#festival-ticket-text').filter({hasText:'AAAAAAAA'}).waitFor({state:'attached'});
 await p.goto('http://localhost/festival.html');
 await p.locator('#festival-ticket-content').waitFor();
 assert.doesNotMatch(await p.locator('#festival-ticket-text').textContent(),/AAAAAAAA/);
 await p.goto('http://localhost/festival.html?edition=10#memories');
 await p.locator('#festival-ticket-content').waitFor();
 assert.equal(await p.locator('#festival-activities').isHidden(),true);

 await p.goto('http://localhost/festival.html');
 await p.evaluate(()=>{let elapsed=0;Object.defineProperty(performance,'now',{value:()=>elapsed,configurable:true});window.setFestivalElapsed=value=>elapsed=value;});
 await p.locator('#festival14-start').click();
 await p.evaluate(()=>window.setFestivalElapsed(14000));
 await p.locator('#festival14-stop').click();
 await p.locator('#festival14-result').filter({hasText:'14 ptを獲得'}).waitFor();
 for (const marker of await p.locator('#festival14-hunt button').filter({hasText:/^14$/}).all()) {
   await marker.click();
   await marker.and(p.locator('[data-found]')).waitFor();
 }
 await p.locator('#festival14-found').filter({hasText:'4 / 4 発見'}).waitFor();
 const draw=p.locator('#festival14-draw');
 for(let step=0;step<3;step++){
   await p.evaluate(now=>window.__festivalNow=now,approved+60000+step*3*60*60*1000);
   await draw.click();
   await p.waitForFunction(count=>document.querySelector('#festival14-points').textContent.includes('記念ガチャ '+count+'回'),step+1);
   assert.equal(await draw.isDisabled(),true);
 }
 await p.locator('#festival14-bonus').click();
 await p.locator('#festival14-secret').waitFor();
 await p.locator('#festival14-game-start').click();
 for(let number=1;number<=14;number++) await p.locator('#festival14-game').getByRole('button',{name:String(number),exact:true}).click();
 await p.locator('#festival14-game-result').filter({hasText:'クリア'}).waitFor();
 await p.reload();
 await p.locator('#festival14-secret').waitFor();
 for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:850});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 }
 await p.screenshot({path:'test-artifacts/festival14.png',fullPage:true});
 await p.evaluate(now=>window.__festivalNow=now,approved+5*86400000);
 await p.locator('#festival-period').filter({hasText:'終了しました'}).waitFor();
 assert.equal(await draw.isDisabled(),true);
 assert.deepEqual(errors,[]);await c.close();console.log('PASS: 5-day Festival, 14-second points, hunt, 3-hour draws, bonus game, archive isolation and responsive venue');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
