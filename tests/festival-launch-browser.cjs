const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');const {chromium}=createRequire(process.env.PLAYWRIGHT_MODULE_PATH||require.resolve('playwright'))('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});const errors=[],root=path.resolve(__dirname,'..'),release='2026-11-01T12:00:00+09:00',start=Date.parse(release),activeTime=Date.parse('2026-11-02T23:59:59+09:00');
async function fixture(releaseAt,now=activeTime){const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});await context.addInitScript(({now})=>{window.__festivalNow=now;const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[window.__festivalNow]));}static now(){return window.__festivalNow;}};},{now});await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();if(url.pathname==='/js/festival-config.js')return route.fulfill({contentType:'text/javascript',body:'export const festivalConfig='+JSON.stringify({releaseAt,durationDays:10})+';'});const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html'});}catch{await route.fulfill({status:404,body:''});}});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return context;}
try{
 const approved=Date.parse('2026-11-07T14:11:54+09:00');
 const c=await fixture('2026-11-07T14:11:54+09:00',approved+60000),p=await c.newPage();p.setDefaultTimeout(10000);
 await p.goto('http://localhost/');await p.locator('.festival-banner').waitFor();await p.locator('#loading-screen').waitFor({state:'detached'});
 assert.match(await p.locator('.festival-banner-time').innerText(),/終了まで 9日/);
 assert.equal(await p.locator('.app-footer .festival-secret').count(),1);
 assert.match(await fs.readFile(path.join(root,'index.html'),'utf8'),/loading-release.*v10.0.*LifeTop10 Fes/);
 assert.match(await p.locator('.settings-about-version').textContent(),/v10.0/);
 assert.match(await p.locator('.settings-about-codename').textContent(),/LifeTop10 Fes/);
 await p.evaluate(async()=>{const m=await import('./js/festival-entry.js');await m.initFestivalEntry();});
 assert.equal(await p.locator('.app-footer .festival-secret').count(),1);assert.equal(await p.locator('.festival-banner').count(),1);
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await fs.mkdir(path.join(root,'test-artifacts'),{recursive:true});await p.screenshot({path:path.join(root,'test-artifacts/festival-launch-'+width+'.png')});}
 await p.locator('.festival-banner-cta').click();await p.frameLocator('#festival-dialog iframe').locator('#festival-ticket-content').waitFor();
 await p.locator('#festival-dialog [data-cancel]').click();await p.locator('#festival-dialog').waitFor({state:'detached'});
 await p.evaluate(end=>window.__festivalNow=end,approved+10*86400000);await p.locator('.festival-banner').waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);await c.close();
 const reduced=await fixture('2026-11-07T14:11:54+09:00',approved+60000),r=await reduced.newPage();await r.emulateMedia({reducedMotion:'reduce'});await r.goto('http://localhost/');await r.locator('.festival-banner').waitFor();assert.equal(await r.locator('.festival-spark').count(),0);await reduced.close();console.log('PASS: approved live event, prominent banner desktop/mobile, countdown, venue ticket, auto-end and reduced motion');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
