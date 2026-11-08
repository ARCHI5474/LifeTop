const assert = require('node:assert/strict');
const { withApp } = require('./helpers/browser.cjs');

withApp(async page => {
    assert.equal(await page.locator('.bookmark-delete-btn').count(), 0);
    await page.locator('#edit-bookmarks-btn').click();
    assert.ok(await page.locator('.bookmark-delete-btn').count() > 0);
    await page.locator('.bookmark-delete-btn').first().waitFor({ state: 'visible' });
    await page.locator('#edit-bookmarks-btn').click();
    assert.equal(await page.locator('.bookmark-delete-btn').count(), 0);
    assert.equal(await page.locator('#search-clear-btn').isVisible(), false);
    await page.locator('#search-input').fill('東京');
    assert.equal(await page.locator('#search-clear-btn').isVisible(), true);
    await page.locator('#search-clear-btn').click();
    assert.equal(await page.locator('#search-input').inputValue(), '');
    await page.keyboard.press('Escape');
    await page.locator('#search-input').blur();
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        const input = await page.locator('#search-input').boundingBox();
        assert.ok(input.width >= 100, `usable search input at ${width}px`);
        await page.locator('[aria-label="Quickパネル"]').click();
        await page.locator('#settings-tab-advanced').click();
        await page.locator('.settings-body').evaluate(e => { e.scrollTop = 240; });
        const tabs = await page.locator('.settings-category-tabs').boundingBox();
        const body = await page.locator('.settings-body').boundingBox();
        assert.ok(tabs.y >= body.y - 1, 'category navigation remains in view');
        assert.equal(await page.locator('.settings-body').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
        await page.locator('#settings-tab-profile').click();
        assert.equal(await page.locator('#settings-category-profile').isVisible(), true);
        if (width === 390) await page.screenshot({ path: 'test-artifacts/quick-panel-mobile.png' });
        await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: 'test-artifacts/search-desktop.png' });
    console.log('PASS: edit-only removal, search clear, responsive search and sticky Quick navigation');
}).catch(error => { console.error(error); process.exitCode = 1; });
