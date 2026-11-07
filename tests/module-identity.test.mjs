import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Browser module identity includes the query string. A second URL for the
// same module silently splits shared state (and previously lost saved tasks).
const root = new URL('../', import.meta.url);
const visited = new Set();
const identities = new Map();
function inspect(url) {
    const identity = url.pathname;
    if (identities.has(identity)) {
        assert.equal(url.href, identities.get(identity), 'Multiple module URLs for ' + identity);
    }
    identities.set(identity, url.href);
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = readFileSync(url, 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        inspect(new URL(specifier, url));
    }
}
for (const page of ['index.html', 'mini-apps.html', 'festival.html', 'messages.html']) {
    const html = readFileSync(new URL(page, root), 'utf8');
    for (const [, entry] of html.matchAll(/<script type="module" src="([^"]+)"/g)) {
        inspect(new URL(entry, root));
    }
}
inspect(new URL('js/mini-pdf-worker.js', root));
console.log('PASS: application module graph uses one URL per shared module');
