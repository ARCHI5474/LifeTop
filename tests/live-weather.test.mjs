import assert from 'node:assert/strict';
import test from 'node:test';
import {createLiveWeather} from '../js/live-weather.js';

test('visibility refresh does not cancel an outstanding geolocation selection', async t => {
    let resolveLocation;
    const document = new EventTarget();
    const storage = new Map();
    const locations = [];
    t.mock.method(globalThis, 'fetch', async url => {
        locations.push(new URL(url).searchParams.get('latitude'));
        return {ok: true, json: async () => ({current_weather: {temperature: 22, weathercode: 0}})};
    });
    globalThis.document = document;
    globalThis.localStorage = {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)};
    const navigator = globalThis.navigator;
    Object.defineProperty(navigator, 'geolocation', {configurable: true, value: {
        getCurrentPosition(resolve) { resolveLocation = resolve; },
    }});
    const weather = createLiveWeather(() => {}, () => {});
    try {
        const pending = weather.select('current');
        document.dispatchEvent(new Event('visibilitychange'));
        resolveLocation({coords: {latitude: 20, longitude: 15}});
        await pending;
        assert.deepEqual(locations, ['20']);
        assert.equal(weather.getLocation(), 'current');

        const obsolete = weather.select('current');
        await weather.select('london');
        resolveLocation({coords: {latitude: 30, longitude: 25}});
        await obsolete;
        assert.deepEqual(locations, ['20', '51.51']);
        assert.equal(weather.getLocation(), 'london');
    } finally {
        weather.destroy();
        delete navigator.geolocation;
        delete globalThis.localStorage;
        delete globalThis.document;
    }
});

test('an earlier timeout cannot abort a newer forecast request', async t => {
    t.mock.timers.enable({apis: ['setTimeout']});
    globalThis.document = new EventTarget();
    globalThis.localStorage = {getItem: () => null, setItem: () => {}};
    const requests = [];
    t.mock.method(globalThis, 'fetch', (_url, {signal}) => new Promise(resolve => requests.push({signal, resolve})));
    const weather = createLiveWeather(() => {}, () => {});
    try {
        const original = weather.refresh();
        t.mock.timers.tick(1000);
        const replacement = weather.select('london');
        assert.equal(requests[0].signal.aborted, true);
        t.mock.timers.tick(5000);
        assert.equal(requests[1].signal.aborted, false);
        for (const request of requests) request.resolve({ok: false});
        await Promise.all([original, replacement]);
    } finally {
        weather.destroy();
        delete globalThis.localStorage;
        delete globalThis.document;
    }
});
