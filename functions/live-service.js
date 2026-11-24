import {assertMember, text, DAY} from './messages-service.js?v=14.0.0';

export const PRESENCE_TTL = 80000;
export const LIVE_DAILY_LIMIT = 100000;
export function createLiveService(db) {
    return async function live(uid, input, now = Date.now()) {
        if (!['heartbeat', 'ripple', 'offline', 'scene'].includes(input?.op)) throw Error('対応していないLive操作です。');
        const roomId = text(input.roomId, 80, 'ルームID');
        const sessionId = text(input.sessionId, 80, 'セッションID');
        if (!/^[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) throw Error('セッションIDが不正です。');
        if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) throw Error('ルームIDが不正です。');
        if (input.op === 'ripple' && (!Number.isFinite(input.x) || !Number.isFinite(input.y) || input.x < 0 || input.x > 1 || input.y < 0 || input.y > 1)) throw Error('波紋の位置が不正です。');
        if (input.op === 'scene' && !['aurora', 'ripple'].includes(input.scene)) throw Error('景色を確認してください。');
        const ref = db.collection('messageRooms').doc(roomId);
        const presence = ref.collection('presence').doc(uid);
        const budgetRef = db.collection('messageBudgets').doc(new Date(now).toISOString().slice(0, 10));
        return db.runTransaction(async tx => {
            const roomSnapshot = await tx.get(ref);
            const room = roomSnapshot.exists ? roomSnapshot.data() : null;
            assertMember(room, uid, now);
            if (input.op === 'scene' && room.owner !== uid) throw Error('景色の変更は管理者だけが実行できます。');
            const snapshot = await tx.get(presence), previous = snapshot.exists ? snapshot.data() : {};
            const sessions = Object.fromEntries(Object.entries(previous.sessions || {}).filter(([, expiry]) => expiry > now));
            const heartbeats = Object.fromEntries(Object.entries(previous.heartbeats || {}).filter(([id]) => Object.hasOwn(sessions, id)));
            if (input.op === 'offline') {
                // Leave is best effort; a missing disconnect is bounded by PRESENCE_TTL.
                if (!Object.hasOwn(sessions, sessionId)) return {serverNow: now};
                delete sessions[sessionId];
                delete heartbeats[sessionId];
                tx.set(presence, {...previous, sessions, heartbeats, nickname: room.nicknames[uid], updatedAtMs: now, expiresAtMs: Math.max(now, ...Object.values(sessions))});
                return {serverNow: now};
            }
            const interval = input.op === 'heartbeat' ? 15000 : 1000;
            if (!Object.hasOwn(sessions, sessionId) && Object.keys(sessions).length >= 5) throw Error('同時に開けるLiveは5画面までです。');
            const rateKey = input.op === 'heartbeat' ? 'lastHeartbeatAtMs' : 'lastActionAtMs';
            const last = input.op === 'heartbeat' ? heartbeats[sessionId] || 0 : previous[rateKey] || 0;
            if (last > 0 && now - last < interval) throw Error('少し待ってから操作してください。');
            const bs = await tx.get(budgetRef), budget = {rooms: 0, messages: 0, ...(bs.exists ? bs.data() : {})};
            if ((budget.live || 0) >= LIVE_DAILY_LIMIT) throw Error('本日のLive利用上限です。');
            sessions[sessionId] = now + PRESENCE_TTL;
            if (input.op === 'heartbeat') heartbeats[sessionId] = now;
            const data = {...previous, sessions, heartbeats, nickname: room.nicknames[uid], updatedAtMs: now, expiresAtMs: Math.max(...Object.values(sessions)), [rateKey]: now};
            if (input.op === 'ripple') data.ripple = {id: `${uid}:${now}`, x: input.x, y: input.y, at: now};
            if (input.op === 'scene') tx.update(ref, {liveScene: input.scene, lastUsedAtMs: now});
            else if (room.lastUsedAtMs < now - DAY) tx.update(ref, {lastUsedAtMs: now});
            tx.set(presence, data);
            tx.set(budgetRef, {...budget, live: (budget.live || 0) + 1});
            return {serverNow: now};
        });
    };
}
