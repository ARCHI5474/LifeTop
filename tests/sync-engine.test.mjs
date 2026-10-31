import assert from 'node:assert/strict';
import {createSyncEngine, canonicalJson, checkedPayload, SYNC_META_KEY, SYNC_RECOVERY_KEY, MAX_SYNC_BYTES} from '../js/sync-engine.js?v=8.0';
import {selectSyncData} from '../js/cloud-sync.js?v=8.0';
import {userConfig} from '../js/config.js?v=8.0';

assert.equal(canonicalJson({b:[2,1],a:1}),canonicalJson({a:1,b:[2,1]}));
assert.throws(()=>checkedPayload({memo:'あ'.repeat(MAX_SYNC_BYTES/2)}),/900KB/,'limit counts UTF-8 bytes');
const selected = selectSyncData({...userConfig,healthLog:{secret:true},calendarEvents:{private:true},token:'secret'});
assert.ok(!('healthLog' in selected) && !('calendarEvents' in selected) && !('token' in selected));

function harness({local={memo:'local'}, cloud=null, base=null}={}) {
    const state = {local,cloud,events:[],writes:0,applies:0,failRead:false,failStorage:false,editing:false};
    const memory = new Map(base ? [[SYNC_META_KEY,JSON.stringify(base)]] : []);
    const storage = {getItem:key=>memory.get(key)??null,setItem(key,value){if(state.failStorage)throw Error('quota');memory.set(key,value);}};
    const remote = {
        async read(){ if(state.failRead)throw Error('offline');return state.cloud; },
        async write(uid,revision,payload,current){
            state.writes++;
            if(!current())throw Error('account changed');
            if((state.cloud?.revision||0)!==revision){const e=Error('conflict');e.code='sync/conflict';throw e;}
            state.cloud={schema:1,revision:revision+1,payload};
        }
    };
    const engine = createSyncEngine({remote,storage,readLocal:()=>state.local,
        applyCloud:data=>{state.local=data;state.applies++;},validate:JSON.parse,
        canApplyCloud:()=>!state.editing,onState:event=>state.events.push(event)});
    return {state,memory,storage,remote,engine};
}
const document = (memo,revision=1) => ({schema:1,revision,payload:canonicalJson({memo})});
const baseline = (memo,revision=1) => ({uid:'alice',revision,payload:canonicalJson({memo})});

// First contact never uploads or downloads without a choice.
let h=harness();h.engine.connect('alice');await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'first-upload');assert.equal(h.state.writes,0);
await h.engine.sync('local');assert.equal(h.state.cloud.revision,1);assert.equal(h.state.events.at(-1).status,'synced');
h=harness({cloud:document('remote')});h.engine.connect('alice');await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'choice');assert.equal(h.state.applies,0);
await h.engine.sync('cloud');assert.equal(h.state.local.memo,'remote');
assert.equal(JSON.parse(h.memory.get(SYNC_RECOVERY_KEY)).memo,'local');

// Offline edits resume using the previous shared snapshot as a baseline.
h=harness({local:{memo:'offline edit'},cloud:document('original'),base:baseline('original')});
h.engine.connect('alice');h.state.failRead=true;await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'error');assert.equal(h.state.local.memo,'offline edit');
h.state.failRead=false;await h.engine.sync();assert.equal(h.state.cloud.revision,2);assert.equal(JSON.parse(h.state.cloud.payload).memo,'offline edit');

// Independent edits cannot overwrite each other automatically.
h=harness({local:{memo:'my edit'},cloud:document('other edit',2),base:baseline('original')});
h.engine.connect('alice');await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'conflict');assert.equal(h.state.writes,0);
await h.engine.sync();assert.equal(h.state.writes,0,'conflict pauses auto sync');
await h.engine.sync('local');assert.equal(h.state.cloud.revision,3);

// A clean device receives remote changes, after active editing ends.
h=harness({local:{memo:'original'},cloud:document('remote',2),base:baseline('original')});
h.engine.connect('alice');h.state.editing=true;await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'waiting');assert.equal(h.state.applies,0);
h.state.editing=false;await h.engine.sync();assert.equal(h.state.local.memo,'remote');

// A full local disk must block replacement, since recovery cannot be saved.
h=harness({cloud:document('remote')});h.engine.connect('alice');h.state.failStorage=true;
await h.engine.sync('cloud');assert.equal(h.state.applies,0);assert.equal(h.state.local.memo,'local');

// A different Google account must ask again even with a valid previous baseline.
h=harness({cloud:document('remote'),base:baseline('local')});h.engine.connect('bob');await h.engine.sync();
assert.equal(h.state.events.at(-1).status,'choice');assert.equal(h.state.writes,0);

// Signing out invalidates an in-flight remote read.
h=harness({cloud:document('remote'),base:baseline('local')});
let finish;h.remote.read=()=>new Promise(resolve=>{finish=resolve;});
h.engine.connect('alice');const request=h.engine.sync();h.engine.disconnect();finish(document('remote'));await request;
assert.equal(h.state.applies,0);assert.equal(h.state.events.at(-1).status,'signed-out');

// Transactions expose concurrent changes instead of blindly retrying with new data.
h=harness({cloud:document('original'),base:baseline('original')});h.engine.connect('alice');
h.remote.write=async()=>{const e=Error('race');e.code='sync/conflict';throw e;};
await h.engine.sync('local');assert.equal(h.state.events.at(-1).status,'conflict');

// Broken remote documents must never be applied.
h=harness({cloud:{schema:2,revision:1,payload:'{}'}});h.engine.connect('alice');await h.engine.sync('cloud');assert.equal(h.state.applies,0);

// Edits during a choice leave the choice available instead of a stuck spinner.
h=harness({cloud:document('remote')});h.engine.connect('alice');
h.remote.read=async()=>{h.state.local={memo:'new edit'};return h.state.cloud;};
await h.engine.sync('cloud');assert.equal(h.state.events.at(-1).status,'choice');assert.equal(h.state.applies,0);
console.log('PASS: explicit first sync, offline edits, conflicts, active editing, quota safety, account isolation, logout races and malformed remote data');
