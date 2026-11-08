const assert = require('node:assert/strict');
const { withApp, openGames, selectGame } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.evaluate(() => document.documentElement.classList.add('reduce-motion'));
    const fits = async selector => {
        await page.waitForFunction(selector => {
            const e = document.querySelector(selector), r = e?.getBoundingClientRect();
            return r && r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
        }, selector);
        if (!selector.startsWith('#game-modal')) {
            const box=await page.locator(selector).boundingBox();
            const viewport=page.viewportSize();
            assert.ok(Math.abs(box.x)<1&&Math.abs(box.y)<1&&Math.abs(box.width-viewport.width)<1&&Math.abs(box.height-viewport.height)<1, `fullscreen: ${selector} ${JSON.stringify(box)} in ${JSON.stringify(viewport)}`);
        }
    };
    // Closing GameBox must also stop and detach its embedded modal state.
    for (let i = 0; i < 3; i++) {
        await openGames(page);
        assert.equal(await page.locator('dialog[open]').count(), 1);
        assert.equal(await page.locator('#mini-app-dialog [role=dialog]').count(), 0);
        assert.equal(await page.locator('#game-overlay.active').count(), 0);
        assert.equal(await page.locator('#game-modal .game-header-actions .close-action').isVisible(),false);
        assert.equal(await page.locator('#mini-app-dialog .game-modal-card').evaluate(e => getComputedStyle(e).borderTopWidth), '0px');
        await page.keyboard.press('Escape');
        await page.locator('#mini-app-dialog').waitFor({ state: 'detached' });
        assert.equal(await page.locator('#game-modal.active,#game-overlay.active').count(), 0);
        assert.equal(await page.locator('#game-modal').evaluate(e => e.inert), true);
        await page.waitForFunction(() => document.body.style.position !== 'fixed');
    }
    for (const [width, height] of [[320,568],[390,844],[768,600],[844,390],[1440,1000]]) {
        await page.setViewportSize({ width, height });
        await page.locator('[aria-label="Quickパネル"]').click();
        await fits('#settings-panel');
        await page.locator('#settings-tab-advanced').click();
        if(width===390||width===1440) await page.screenshot({path:`test-artifacts/quick-fullscreen-${width}.png`});
        // A native child dialog must not close the underlying Quick panel.
        await page.locator('#sync-explanation-open').click();
        await fits('#sync-explanation');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#settings-panel.active').count(), 1);
        assert.equal(await page.locator('body').evaluate(e => e.style.position), 'fixed');
        await page.locator('#stability-check-open').click();
        await fits('#stability-check');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await page.locator('.add-bookmark-btn').click();
        await fits('#bookmark-dialog .popup-modal-card');
        await page.keyboard.press('Escape');
        await page.locator('#weather-widget').click();
        await fits('.weather-modal.active .weather-modal-content');
        await page.keyboard.press('Escape');
        for (const selector of ['#home-horoscope-card','#home-messages-card']) {
            await page.locator(selector).click();
            await fits('dialog.cc-form-dialog[open]');
            await page.keyboard.press('Escape');
            await page.locator('dialog.cc-form-dialog').waitFor({state:'detached'});
        }
        await page.locator('#home-calendar-card').click();
        await fits('#cc-dialog');
        await page.getByRole('button', {name:'予定を作成', exact:true}).click();
        await fits('dialog.cc-form-dialog[open]');
        await page.keyboard.press('Escape');
        await page.locator('dialog.cc-form-dialog').waitFor({state:'detached'});
        assert.equal(await page.locator('#cc-dialog[open]').count(),1);
        await page.keyboard.press('Escape');
        await page.locator('#cc-dialog').waitFor({state:'detached'});
        await openGames(page);
        await selectGame(page,'othello');
        await fits('#mini-app-dialog');
        await fits('#game-modal .game-modal-card');
        await page.locator('[aria-label="遊び方を表示"]').click();
        await fits('#game-rules');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#game-modal').evaluate(e => e.scrollWidth <= e.clientWidth + 1),true);
        if(width===390||width===1440) await page.screenshot({path:`test-artifacts/gamebox-stable-${width}.png`});
        await page.keyboard.press('Escape');
        await page.locator('#mini-app-dialog').waitFor({state:'detached'});
        await page.evaluate(async () => (await import('/js/festival-popup.js')).openFestival());
        await fits('#festival-dialog');
        await page.keyboard.press('Escape');
        await page.locator('#festival-dialog').waitFor({state:'detached'});
    }
    await page.locator('[aria-label="Quickパネル"]').click();
    await page.locator('#settings-tab-advanced').click();
    await page.evaluate(() => {
        document.documentElement.style.setProperty('--visual-height','300px');
        document.documentElement.style.setProperty('--visual-top','40px');
    });
    const smallViewport=await page.locator('#settings-panel').boundingBox();
    assert.ok(smallViewport.y>=40&&smallViewport.y+smallViewport.height<=340,'Quick panel follows a reduced visual viewport');
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => parseFloat(document.documentElement.style.getPropertyValue('--visual-height')) === innerHeight);
    assert.equal(await page.locator('#backup-upload').isVisible(),false);
    await page.locator('.backup-restore-options summary').click();
    await page.locator('#backup-upload').setInputFiles({ name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}') });
    await page.locator('#data-management-status').filter({hasText:'対応するLifeTopバックアップではありません'}).waitFor();
    assert.equal(await page.locator('#backup-restore').isVisible(),false);
    const backup=await page.evaluate(async () => (await import('/js/data-management.js?v=9.0')).createBackup());
    await page.locator('#backup-upload').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await page.locator('#backup-restore').waitFor({state:'visible'});
    await page.locator('#backup-cancel').click();
    assert.equal(await page.locator('#backup-restore').isVisible(),false);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.style.position !== 'fixed' && getComputedStyle(document.body).overflow !== 'hidden');
    console.log('PASS: GameBox repeated close, single frame, nested Escape/scroll lock, responsive popups and invalid backup safety');
}).catch(error => {console.error(error);process.exitCode=1;});
