const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');
withApp(async page => {
    await page.evaluate(async () => {
        const {openUIDialog} = await import('./js/ui-dialog.js');
        const dialog = document.createElement('dialog');
        dialog.id = 'close-style-test';
        dialog.className = 'cc-dialog ui-scope';
        dialog.innerHTML = '<button class="cc-control cc-icon" data-cancel aria-label="閉じる">×</button>';
        document.body.append(dialog);
        openUIDialog(dialog);
    });
    const styles = () => page.evaluate(() => [...document.querySelectorAll('#settings-panel .close-action, #close-style-test [data-cancel]')].map(button => {
        const s = getComputedStyle(button), icon = getComputedStyle(button, '::after');
        return {width:s.width, height:s.height, radius:s.borderRadius, background:s.backgroundColor, mask:icon.maskImage, iconWidth:icon.width};
    }));
    assert.deepEqual((await styles())[0], (await styles())[1], 'legacy and native dialog close controls share size, surface and glyph');
    assert.equal((await styles())[0].width, '44px');
    assert.equal((await styles())[0].iconWidth, '20px');
    await page.locator('#close-style-test [data-cancel]').hover();
    await page.mouse.down();
    await page.waitForTimeout(180);
    const pressed = await page.locator('#close-style-test [data-cancel]').evaluate(e => ({transform:getComputedStyle(e).transform,scale:getComputedStyle(e).scale}));
    assert.match(pressed.transform, /0\.96/);
    assert.ok(['none', '1'].includes(pressed.scale), 'close feedback does not stack JS scale with CSS transform');
    await page.mouse.up();
    await page.locator('#close-style-test').waitFor({state:'detached'});
    console.log('PASS: shared close glyph, size, surface, press feedback and dismissal');
});

