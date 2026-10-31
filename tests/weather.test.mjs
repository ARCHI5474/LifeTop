import assert from 'node:assert/strict';
import { weatherNumber, forecastIndex, getWeatherData } from '../js/weather.js?v=8.0';

for (const value of [null, undefined, NaN, Infinity, '20']) assert.equal(weatherNumber(value, '°C'), '--');
assert.equal(weatherNumber(0, '%'), '0%');
assert.equal(weatherNumber(-2.6, '°C'), '-3°C');
const times = ['2026-10-31T22:00', '2026-10-31T23:00', '2026-11-01T00:00'];
assert.equal(forecastIndex(times, '2026-10-31T22:15'), 1);
assert.equal(forecastIndex(times, '2026-11-01T00:00'), 2);
assert.equal(forecastIndex(times, '2026-11-02T00:00'), 2);
assert.equal(forecastIndex(times, '2026-10-30T00:00'), 0);

const pending = [];
const stored = new Map();
globalThis.fetch = () => new Promise(resolve => pending.push(resolve));
globalThis.document = {getElementById:()=>null,querySelector:()=>null};
globalThis.localStorage = {setItem:(key,value)=>stored.set(key,value)};
const first = getWeatherData(35,139);
const second = getWeatherData(36,140);
pending[1]({ok:true,json:async()=>({current_weather:{temperature:22}})});
await second;
pending[0]({ok:true,json:async()=>({current_weather:{temperature:10}})});
await first;
const cached = JSON.parse(stored.get('lifetop_weather_cache_v1'));
assert.equal(cached.data.current_weather.temperature,22,'a delayed old request must not overwrite newer weather');
assert.equal(cached.lat,36);
console.log('PASS: missing weather values, timezone-independent forecast and stale request protection');
