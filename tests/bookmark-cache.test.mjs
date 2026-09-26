import assert from 'node:assert/strict';

const elements = new Map();
const element = id => {
    if (!elements.has(id)) elements.set(id, {
        innerHTML: '', style: {}, classList: { toggle() {}, remove() {}, add() {} },
    });
    return elements.get(id);
};
globalThis.document = {
    getElementById: element,
    querySelector: selector => selector === '.bookmark-tab-item.active' ? null : element(selector),
};
let stored = 'null';
let writes = 0;
globalThis.localStorage = { getItem: () => stored, setItem: () => { writes++; } };

for (const [index, value] of ['null', '[]', '{invalid', JSON.stringify({
    'www.google.com': { url: '" onerror="unexpectedCode()', timestamp: Date.now() },
})].entries()) {
    stored = value;
    const bookmarks = await import(`../js/bookmarks.js?cache-case=${index}`);
    assert.doesNotThrow(() => bookmarks.renderBookmarks());
    const html = element('bookmark-grid').innerHTML;
    assert.match(html, /https:\/\/a\.favicon\.im\//);
    assert.doesNotMatch(html, /unexpectedCode/);
    assert.match(element('bookmark-tabs').innerHTML, /<button type="button"/);
    const before = writes;
    const image = { style: {}, previousElementSibling: { style: {} } };
    bookmarks.handleFaviconLoad(image, 'example.com', 'https://a.favicon.im/example.com');
    bookmarks.handleFaviconLoad(image, 'example.com', 'https://a.favicon.im/example.com');
    assert.equal(writes - before, 1, 'fresh icons should not repeatedly write to storage');
}
console.log('PASS: malformed favicon cache recovery, safe image URLs and bounded cache writes');
