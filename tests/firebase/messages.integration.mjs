import assert from 'node:assert/strict';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator, signInAnonymously} from 'firebase/auth';
import {getFirestore, connectFirestoreEmulator, doc, collection, query, orderBy, limit, where, Timestamp, getDoc, getDocs, onSnapshot, terminate} from 'firebase/firestore';
import {getFunctions, connectFunctionsEmulator, httpsCallable} from 'firebase/functions';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-lifetop') throw Error('Emulator only.');
const clients = [], delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function client(name) {
    const app = initializeApp({projectId: 'demo-lifetop', apiKey: 'demo-key', appId: 'demo-app'}, name), auth = getAuth(app), db = getFirestore(app), functions = getFunctions(app, 'asia-northeast1');
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectAuthEmulator(auth, 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST, {disableWarnings: true});
    connectFirestoreEmulator(db, host, Number(port)); connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    await signInAnonymously(auth);
    let next = 0;
    const c = {app, auth, db, async command(op, extra = {}) {
        await delay(Math.max(0, next - Date.now())); next = Date.now() + 1100;
        return (await httpsCallable(functions, 'messagesCommand')({op, ...extra})).data;
    }, async live(op, extra = {}) { return (await httpsCallable(functions, 'liveCommand')({op, sessionId: 'session-' + name, ...extra})).data; }};
    clients.push(c); return c;
}
function watchOnce(ref, predicate) {
    return new Promise((resolve, reject) => {
        let unwatch; const timeout = setTimeout(() => { unwatch?.(); reject(Error('Snapshot did not arrive')); }, 15000);
        unwatch = onSnapshot(ref, snapshot => { if (predicate(snapshot)) { clearTimeout(timeout); unwatch?.(); resolve(snapshot); } }, error => { clearTimeout(timeout); reject(error); });
    });
}
try {
    const alice = await client('alice-integration'), bob = await client('bob-integration'), outsider = await client('outsider-integration');
    const room = await alice.command('create', {name: 'Integration Sky', nickname: 'Alice'}), roomId = room.roomId;
    await assert.rejects(getDoc(doc(outsider.db, 'messageRooms', roomId)), /permission|insufficient/i);
    await assert.rejects(outsider.live('heartbeat', {roomId}));
    await bob.command('join', {token: room.token, nickname: 'Bob'});
    const liveQuery = query(collection(bob.db, 'messageRooms', roomId, 'presence'), orderBy('updatedAtMs', 'desc'), limit(20));
    const connected = watchOnce(liveQuery, s => s.docs.some(d => d.id === alice.auth.currentUser.uid && d.data().expiresAtMs > Date.now()));
    await alice.live('heartbeat', {roomId}); await connected;
    await bob.live('heartbeat', {roomId});
    const wave = watchOnce(liveQuery, s => s.docs.some(d => d.data().ripple?.x === .25));
    await alice.live('ripple', {roomId, x: .25, y: .75}); await wave;
    await assert.rejects(bob.live('scene', {roomId, scene: 'ripple'}));
    await delay(1100); await alice.live('scene', {roomId, scene: 'ripple'});
    assert.equal((await getDoc(doc(bob.db, 'messageRooms', roomId))).data().liveScene, 'ripple');
    await alice.command('send', {roomId, nickname: 'Alice', body: '<b>hello</b>', requestId: 'integration-message'});
    const history = query(collection(bob.db, 'messageRooms', roomId, 'messages'), where('expiresAt', '>', Timestamp.fromMillis(Date.now() + 60000)), orderBy('expiresAt', 'desc'), limit(100));
    const messages = await getDocs(history); assert.equal(messages.size, 1); assert.equal(messages.docs[0].data().body, '<b>hello</b>');
    await alice.command('send', {roomId, nickname: 'Alice', body: '<b>hello</b>', requestId: 'integration-message'});
    assert.equal((await getDocs(history)).size, 1, 'real server idempotency');
    await assert.rejects(bob.command('deleteMessage', {roomId, messageId: 'integration-message'}));
    await alice.command('deleteMessage', {roomId, messageId: 'integration-message'}); assert.equal((await getDocs(history)).size, 0);
    await alice.live('offline', {roomId});
    assert.ok((await getDoc(doc(bob.db, 'messageRooms', roomId, 'presence', alice.auth.currentUser.uid))).data().expiresAtMs <= Date.now());
    await bob.command('leave', {roomId}); await assert.rejects(bob.live('heartbeat', {roomId}));
    await alice.command('deleteRoom', {roomId}); await assert.rejects(getDocs(history));
    console.log('PASS: real local Auth + callable Functions + Firestore; two anonymous users, invite, snapshots, presence, ripple, scene rights, message idempotency, deletion and revocation');
} finally {
    await Promise.all(clients.map(async c => { await terminate(c.db); await deleteApp(c.app); }));
}
