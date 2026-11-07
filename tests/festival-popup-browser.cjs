const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createRequire}=require('node:module');const {chromium}=createRequire(process.env.PLAYWRIGHT_MODULE_PATH||require.resolve('playwright'))('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});const errors=[],root=path.resolve(__dirname,'..'),release='2026-11-01T12:00:00+09:00',start=Date.parse(release),activeTime=Date.parse('2026-11-02T23:59:59+09:00');
async function fixture(releaseAt,now=activeTime){const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});await context.addInitScript(({now})=>{window.__festivalNow=now;const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[window.__festivalNow]));}static now(){return window.__festivalNow;}};},{now});await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();if(url.pathname==='/js/festival-config.js')return route.fulfill({contentType:'text/javascript',body:'export const festivalConfig='+JSON.stringify({releaseAt,durationDays:10})+';'});const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep))return route.abort();try{await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html'});}catch{await route.fulfill({status:404,body:''});}});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return context;}
try {
 const context=await fixture(null),page=await context.newPage();page.setDefaultTimeout(10000);
 await page.goto('http://localhost/');await page.locator('.festival-entry').waitFor();
 await page.evaluate(()=>scrollTo(0,200));const scroll=await page.evaluate(()=>scrollY);
 await page.locator('.festival-entry').click();await page.frameLocator('#festival-dialog iframe').locator('#festival-period').filter({hasText:'未設定'}).waitFor();
 assert.equal(await page.locator('body').evaluate(n=>n.style.position),'fixed');
 await page.mouse.wheel(0,500);assert.equal(await page.evaluate(()=>scrollY),0);
 await page.locator('#festival-dialog [data-cancel]').click();await page.locator('#festival-dialog').waitFor({state:'detached'});
 await page.evaluate(async()=>{const m=await import('./js/mini-popup.js');m.openMiniApps();});
 const frame=page.frameLocator('#mini-app-dialog iframe');await frame.locator('.mini-app-card:visible').first().waitFor();
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
 await page.setViewportSize(size);await page.waitForTimeout(150);
 const dims=await frame.locator('html').evaluate(n=>({height:n.scrollHeight,width:n.scrollWidth,h:innerHeight,w:innerWidth}));assert.ok(dims.width<=dims.w+1,JSON.stringify(dims));assert.ok(dims.height<=dims.h+1,JSON.stringify(dims));
 await fs.mkdir(path.join(root,'test-artifacts'),{recursive:true});await page.screenshot({path:path.join(root,'test-artifacts/studio-fit-'+size.width+'.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view=games]').click();await page.locator('#game-modal.active').waitFor();
 const fit=await page.locator('#mini-app-dialog .game-modal-card').evaluate(n=>({bottom:n.getBoundingClientRect().bottom,h:innerHeight}));assert.ok(fit.bottom<=fit.h,JSON.stringify(fit));
 await page.screenshot({path:path.join(root,'test-artifacts/gamebox-fit.png')});
 assert.deepEqual(errors,[]);console.log('PASS: Festival popup, background scroll lock, Studio desktop/mobile/landscape fit, GameBox fit');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
