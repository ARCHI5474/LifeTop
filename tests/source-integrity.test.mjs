import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const directory of ['js/', 'functions/', 'scripts/', 'tests/helpers/']) {
    for (const file of readdirSync(new URL(directory, root)).filter(name => /\.(?:js|cjs|mjs)$/.test(name))) {
        const target = new URL(directory + file, root);
        const result = spawnSync(process.execPath, ['--check', fileURLToPath(target)], { encoding: 'utf8' });
        assert.equal(result.status, 0, `${directory}${file}: ${result.stderr}`);
    }
}
for (const name of ['index.html', 'mini-apps.html', 'festival.html', 'messages.html']) {
    const page = new URL(name, root);
    const source = readFileSync(page, 'utf8');
    const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${name} has unique element IDs`);
    for (const [, reference] of source.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (/^(?:https?:|data:|mailto:|tel:)/.test(reference)) continue;
        assert.ok(existsSync(new URL(reference.split(/[?#]/)[0], page)), `${name} links to missing file: ${reference}`);
    }
}
for (const name of readdirSync(new URL('css/', root)).filter(name => name.endsWith('.css'))) {
    const file = new URL('css/' + name, root);
    const source = readFileSync(file, 'utf8');
    for (const [, reference] of source.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (/^(?:https?:|data:|#)/.test(reference)) continue;
        assert.ok(existsSync(new URL(reference.split(/[?#]/)[0], file)), `${name} references missing asset: ${reference}`);
    }
}
console.log('PASS: JavaScript syntax, unique HTML IDs and local asset links');
