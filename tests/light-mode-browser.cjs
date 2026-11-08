const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    await page.locator('[aria-label="Quickパネル"]').click();
    await page.locator('#settings-tab-appearance').click();
    for (const mode of ['light', 'dark', 'light']) {
        await page.locator(`[data-ui-mode="${mode}"]`).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), mode);
        assert.equal(await page.locator('body').getAttribute('data-theme'), mode);
        assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).colorScheme), mode);
    }
    await page.keyboard.press('Escape');
    await page.reload();
    await page.locator('#loading-screen').waitFor({ state: 'detached' });
    assert.equal(await page.locator('body').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(245, 247, 250)');
    assert.equal(await page.locator('#todo-input').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(247, 250, 255)');
    assert.equal(await page.locator('.weather-summary-icon').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(230, 238, 247)');
    assert.equal(await page.locator('.hero-section + .weather-summary-row').count(), 1);
    // Scopes inserted with an old theme must follow the current page theme.
    await page.evaluate(() => {
        const scope = document.createElement('div');
        scope.id = 'theme-probe'; scope.className = 'ui-scope'; scope.dataset.theme = 'dark';
        document.body.append(scope);
    });
    await page.waitForFunction(() => document.querySelector('#theme-probe').dataset.theme === 'light');
    await page.locator('#theme-probe').evaluate(e => e.remove());
    await page.evaluate(async () => {
        const { userConfig } = await import('/js/config.js?v=9.0');
        const { applyStyles } = await import('/js/styles.js?v=9.0');
        const { applyUISystemPreferences } = await import('/js/ui-system.js');
        userConfig.bgType = 'gradient-purple'; userConfig.highContrast = true;
        applyStyles(); applyUISystemPreferences(userConfig);
        document.documentElement.classList.add('high-contrast');
    });
    const colors = await page.locator('body').evaluate(e => {
        const s = getComputedStyle(e);
        return [s.getPropertyValue('--ui-text').trim(), s.getPropertyValue('--ui-text-muted').trim()];
    });
    assert.deepEqual(colors, ['#101820', '#101820']);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#bg-overlay'), '::after').backgroundColor === 'rgba(242, 248, 255, 0.12)');
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const search = await page.locator('#search-form').boundingBox();
        const cards = await page.locator('.weather-summary-row').boundingBox();
        assert.ok(cards.y >= search.y + search.height, 'summary cards below search');
        assert.equal(await page.locator('.weather-summary-row > button').count(), 4);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    await page.locator('[aria-label="Quickパネル"]').click();
    await page.locator('#settings-tab-appearance').click();
    assert.equal(await page.locator('[data-ui-mode=light]').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    const welcome = page.locator('.festival-pop button').filter({ hasText: '閉じる' });
    if (await welcome.isVisible()) await welcome.click();
    await page.screenshot({ path: 'test-artifacts/light-home-desktop.png', fullPage: true });
    console.log('PASS: repeated theme switching, persistence, dynamic scopes, light custom background/high contrast and card placement at 320–1440px');
}).catch(error => { console.error(error); process.exitCode = 1; });
