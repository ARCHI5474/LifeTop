import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveService, PRESENCE_TTL, LIVE_DAILY_LIMIT} from '../functions/live-service.js?v=13.0.1';
import {createMessagesService, DAY} from '../functions/messages-service.js?v=13.0.1';
import {activePresence, newRipples, skyState, frequencyBands} from '../js/live-model.js?v=13.0.1';
import {database} from './helpers/memory-firestore.mjs';
const now = Date.UTC(2026, 10, 16), stamp = {fromMillis: value => value};
async function fixture() {
    const {db, rows} = database(), messages = createMessagesService(db, stamp), live = createLiveService(db);
    const room = await messages('alice', {op: 'create', name: 'Sky', nickname: 'Alice'}, now);
    await messages('bob', {op: 'join', token: room.token, nickname: 'Bob'}, now);
    return {rows, live: (uid, data, at = now) => live(uid, {roomId: room.roomId, ...data, sessionId: 'session-' + (data.sessionId || 's1').padEnd(16, '0')}, at), messages, room};
}
test('Live requires membership, validates coordinates, limits rates, and restricts scene to owner', async () => {
    const {live, rows, room} = await fixture();
    await assert.rejects(live('outsider', {op: 'heartbeat'}));
    await live('alice', {op: 'heartbeat'});
    await assert.rejects(live('alice', {op: 'heartbeat'}, now + 1000));
    await assert.rejects(live('bob', {op: 'scene', scene: 'ripple'}));
    await assert.rejects(live('alice', {op: 'ripple', x: NaN, y: .5}));
    await assert.rejects(live('alice', {op: 'ripple', x: 2, y: .5}));
    await live('alice', {op: 'scene', scene: 'ripple'}, now + 2000);
    assert.equal(rows.get('messageRooms/' + room.roomId).liveScene, 'ripple');
    await live('bob', {op: 'ripple', x: .1, y: .7}, now + 3000);
    await assert.rejects(live('bob', {op: 'ripple', x: .1, y: .7}, now + 3500));
    const p = rows.get('messageRooms/' + room.roomId + '/presence/bob');
    assert.equal(p.nickname, 'Bob'); assert.equal(p.expiresAtMs, now + 3000 + PRESENCE_TTL);
    await live('alice', {op: 'ripple', x: .2, y: .4}, now + 25000);
    await live('alice', {op: 'heartbeat'}, now + 30000);
    await assert.rejects(live('bob', {op: 'heartbeat'}, now + 91 * DAY));
});
test('closing one screen preserves another; delayed offline cannot clear a newer session', async () => {
    const {live, rows, room} = await fixture();
    await live('alice', {op: 'heartbeat'});
    await live('alice', {op: 'heartbeat', sessionId: 's2'}, now + 1000);
    await live('alice', {op: 'offline'}, now + 2000);
    const path = 'messageRooms/' + room.roomId + '/presence/alice';
    assert.equal(rows.get(path).expiresAtMs, now + 1000 + PRESENCE_TTL);
    await live('alice', {op: 'offline'}, now + 3000);
    assert.ok(rows.get(path).sessions['session-' + 's2'.padEnd(16, '0')]);
    await live('alice', {op: 'offline', sessionId: 's2'}, now + 4000);
    assert.equal(rows.get(path).expiresAtMs, now + 4000);
    await live('alice', {op: 'heartbeat'}, now + 5000);
    for (let i = 2; i <= 5; i++) await live('alice', {op: 'heartbeat', sessionId: 's' + i}, now + 5000);
    await assert.rejects(live('alice', {op: 'heartbeat', sessionId: 's6'}, now + 5000));
    await live('alice', {op: 'heartbeat', sessionId: 's6'}, now + 90000);
    assert.deepEqual(Object.keys(rows.get(path).sessions), ['session-' + 's6'.padEnd(16, '0')]);
});
test('day rollover preserves both message and Live budgets; deletion revokes Live', async () => {
    const {live, rows, room, messages} = await fixture(), tomorrow = now + DAY;
    await live('alice', {op: 'heartbeat'}, tomorrow);
    await messages('alice', {op: 'send', roomId: room.roomId, nickname: 'Alice', body: 'hello', requestId: 'next-day'}, tomorrow + 2000);
    const path = 'messageBudgets/' + new Date(tomorrow).toISOString().slice(0, 10);
    assert.deepEqual(rows.get(path), {rooms: 0, messages: 1, live: 1});
    rows.set(path, {...rows.get(path), live: LIVE_DAILY_LIMIT});
    await assert.rejects(live('bob', {op: 'heartbeat'}, tomorrow + 4000));
    await messages('alice', {op: 'deleteRoom', roomId: room.roomId}, tomorrow + 5000);
    await assert.rejects(live('bob', {op: 'heartbeat'}, tomorrow + 6000));
});
test('membership exit removes presence immediately and prevents later heartbeat', async () => {
    const {live, rows, room, messages} = await fixture();
    await live('bob', {op: 'heartbeat'});
    await messages('bob', {op: 'leave', roomId: room.roomId}, now + 1000);
    assert.equal(rows.has('messageRooms/' + room.roomId + '/presence/bob'), false);
    await assert.rejects(live('bob', {op: 'heartbeat'}, now + 2000));
});
test('client expires stale members, drops malformed/replayed ripples, models daylight and audio bands', () => {
    const rows = [{id: 'a', updatedAtMs: now, expiresAtMs: now + 1000, ripple: {id: 'r', x: .5, y: .7, at: now}}, {id: 'b', updatedAtMs: now, expiresAtMs: now - 1}];
    assert.equal(activePresence(rows, ['a', 'b'], now).length, 1);
    assert.equal(activePresence(rows, [], now).length, 0);
    assert.equal(activePresence(rows, ['a'], now + 1001).length, 0);
    const seen = new Set(); assert.equal(newRipples(rows, seen, now).length, 1); assert.equal(newRipples(rows, seen, now).length, 0);
    assert.equal(newRipples(rows, new Set(), now + 9000).length, 0);
    assert.equal(newRipples([{ripple: {id: 'bad', x: -1, y: .5, at: now}}], new Set(), now).length, 0);
    const data = {utc_offset_seconds: 0, daily: {sunrise: [now / 1000 + 6 * 3600], sunset: [now / 1000 + 18 * 3600]}, current_weather: {weathercode: 71, windspeed: 99}};
    assert.equal(skyState(data, now + 12 * 3600000).daylight, 1); assert.equal(skyState(data, now).daylight, 0); assert.equal(skyState(data, now).snow, true); assert.equal(skyState(data, now).wind, 60);
    assert.deepEqual(frequencyBands(new Uint8Array(1024), 48000, 2048), [0, 0, 0]);
    assert.deepEqual(frequencyBands(new Uint8Array(1024).fill(255), 48000, 2048), [1, 1, 1]);
});
