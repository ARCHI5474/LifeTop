const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    for(const mode of ['light','dark']) {
        await page.locator('[aria-label="Quickパネル"]').click();
        await page.locator('#settings-tab-appearance').click();
        await page.locator(`[data-ui-mode=${mode}]`).click();
        const contrast=await page.evaluate(()=>{
            const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),style=getComputedStyle(document.body);
            const parse=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
            const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
            const ratio=(a,b)=>{a=lum(parse(style.getPropertyValue(a).trim()));b=lum(parse(style.getPropertyValue(b).trim()));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
            return {body:ratio('--ui-text','--ui-surface'),muted:ratio('--ui-text-muted','--ui-surface'),button:ratio('--ui-primary','--ui-on-primary')};
        });
        assert.ok(Object.values(contrast).every(v=>v>=4.5), `${mode} text contrast ${JSON.stringify(contrast)}`);
        if(mode==='light') {
            await page.waitForFunction(()=>getComputedStyle([...document.querySelectorAll('.color-combo')].at(-1)).backgroundColor==='rgb(247, 250, 255)');
            await page.screenshot({path:'test-artifacts/glass-settings-light.png'});
        }
        await page.keyboard.press('Escape');
        await page.locator('#settings-panel').waitFor({state:'hidden'});
        const card=await page.locator('.glass-card').first().evaluate(e=>{const s=getComputedStyle(e);return {image:s.backgroundImage,blur:s.backdropFilter};});
        assert.match(card.image,/linear-gradient/);
        assert.match(card.blur,/blur/);
        for(const width of [320,390,768,1440]) {
            await page.setViewportSize({width,height:1000});
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
            const clock=await page.locator('#clock').boundingBox();
            assert.ok(clock.width>0&&clock.x+clock.width<=width);
            if(width===390||width===1440) await page.screenshot({path:`test-artifacts/glass-${mode}-${width}.png`,fullPage:true});
        }
    }
    const result=await page.evaluate(async()=>{
        const {userConfig}=await import('/js/config.js?v=9.0');
        const {updateClock}=await import('/js/clock.js?v=9.0');
        const OriginalDate=Date;
        const hour=document.querySelector('.clock-hours');
        try {
            window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[2026,10,8,23,7,9]));}};
            userConfig.clock12h=true;updateClock();
            const pm={label:document.querySelector('#clock').getAttribute('aria-label'),period:document.querySelector('#clock-period').textContent,seconds:document.querySelector('#clock-sec').textContent};
            window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[2026,10,9,0,0,0]));}};
            updateClock();
            return {pm,am:document.querySelector('#clock').getAttribute('aria-label'),stable:hour===document.querySelector('.clock-hours'),progress:document.querySelector('#clock-day-progress').style.width};
        } finally {window.Date=OriginalDate;userConfig.clock12h=false;updateClock();}
    });
    assert.deepEqual(result,{pm:{label:'11:07 PM',period:'PM',seconds:'09'},am:'12:00 AM',stable:true,progress:'0%'});
    console.log('PASS: glass surfaces, mode-aware controls, light/dark text contrast, responsive clock, stable digits and 12-hour midnight rollover');
}).catch(error=>{console.error(error);process.exitCode=1;});
