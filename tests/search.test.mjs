import assert from 'node:assert/strict';
import { initSearchSuggestions } from '../js/search.js?v=9.0';

class Element {
    listeners = {}; attributes = {}; children = []; value = ''; hidden = false;
    classes = new Set();
    classList = {
        contains: name => this.classes.has(name),
        remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
    addEventListener(name, fn) { (this.listeners[name] ??= []).push(fn); }
    fire(name, extra = {}) { for (const fn of this.listeners[name] ?? []) fn({ type: name, preventDefault() {}, ...extra }); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    replaceChildren(...children) { this.children = children; }
    querySelectorAll() { return this.children; }
    querySelector() { return this.children.find(item => item.classes.has('active')); }
    scrollIntoView() { this.scrolled = true; }
    closest() { return container; }
    remove() {}
}
const input = new Element(), list = new Element(), form = new Element(), clear = new Element();
const container = { contains: node => node === input };
form.querySelector = () => new Element();
input.form = form;
const elements = { 'search-input': input, 'search-suggestions': list, 'search-form': form, 'search-clear-btn': clear };
const timers = new Map(); let nextTimer = 0;
globalThis.setTimeout = fn => { timers.set(++nextTimer, fn); return nextTimer; };
globalThis.clearTimeout = id => timers.delete(id);
globalThis.window = { setTimeout, clearTimeout, matchMedia: () => ({ matches: false }) };
globalThis.localStorage = { getItem: () => null };
globalThis.document = {
    activeElement: input, getElementById: id => elements[id],
    addEventListener() {}, querySelector: () => null,
    createElement: () => new Element(), head: { appendChild() {} }
};
const requests = [];
globalThis.fetch = (url, { signal }) => new Promise(resolve => requests.push({ signal, resolve }));
const runTimers = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); };
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
initSearchSuggestions();
input.value = '東京'; input.fire('input'); runTimers();
assert.equal(requests.length, 1);
input.value = ''; input.fire('input');
assert.equal(requests[0].signal.aborted, true, 'clearing text cancels the previous request immediately');
requests[0].resolve({ ok: true, json: async () => ['', ['古い候補']] }); await flush();
assert.ok(!list.children.some(item => item.textContent === '古い候補'));

input.value = '京都'; input.fire('input', { isComposing: true });
input.fire('compositionupdate'); runTimers();
assert.equal(requests.length, 1, 'IME composition does not send incomplete queries');
input.fire('compositionend'); runTimers();
assert.equal(requests.length, 2);
input.fire('keydown', { key: 'ArrowDown' });
assert.equal(list.children[0].scrolled, true);
requests[1].resolve({ ok: true, json: async () => ['', ['京都 天気', '京都 観光']] }); await flush();
assert.equal(list.children[0].textContent, '京都', 'remote results preserve the keyboard selection');
assert.equal(input.attributes['aria-activedescendant'], 'search-suggestion-0');
assert.equal(requests[1].signal.aborted, true, 'the losing suggestion provider is cancelled');

document.activeElement = form; input.fire('blur'); runTimers();
assert.equal(list.classList.contains('active'), false, 'Tab away closes suggestions even with text remaining');
assert.equal(input.attributes['aria-expanded'], 'false');
console.log('PASS: search cancellation, stale responses, IME composition, keyboard selection and blur');
