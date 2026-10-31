import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,DEFAULT_CONTENT} from '../js/config.js?v=8.0';
import {mergeInitialData} from '../js/sync-migration.js?v=8.0';
import {createSyncEngine,canonicalJson,SYNC_META_KEY,SYNC_RECOVERY_KEY} from '../js/sync-engine.js?v=8.0';
import {shouldShowSyncPrompt,REMINDER_INTERVAL} from '../js/sync-onboarding.js?v=8.0';

const defaults=()=>structuredClone({...DEFAULT_SETTINGS,...DEFAULT_CONTENT});
const local=defaults(), cloud=defaults();
local.memo='<local>';local.memoHtml='';local.todoList=[{id:1,text:'端末のタスク',completed:false}];
local.bookmarks=[{type:'folder',id:'folder_1',title:'端末',children:[{title:'A',url:'https://a.example'}]}];
cloud.memo='クラウドのメモ';cloud.todoList=[{id:1,text:'クラウドのタスク',completed:true}];
cloud.bookmarks=[{type:'folder',id:'folder_1',title:'クラウド',children:[]}];
const merged=mergeInitialData(local,cloud);
assert.equal(merged.todoList.length,2);assert.equal(new Set(merged.todoList.map(t=>t.id)).size,2);
assert.equal(merged.bookmarks.length,2);assert.equal(new Set(merged.bookmarks.map(b=>b.id)).size,2);
assert.ok(merged.memo.includes(local.memo)&&merged.memo.includes(cloud.memo));assert.match(merged.memoHtml,/&lt;local&gt;/);
assert.deepEqual(mergeInitialData(defaults(),cloud),cloud,'new devices take cloud data without reintroducing sample tasks');
assert.deepEqual(mergeInitialData(local,defaults()),local);
assert.deepEqual(mergeInitialData(cloud,cloud),cloud,'identical data is not duplicated');
assert.equal(local.todoList[0].id,1,'migration must not mutate input data');
const a=defaults(),b=defaults();a.textSize='large';b.memo='existing';assert.equal(mergeInitialData(a,b).textSize,'large');

const storage=new Map();let current=structuredClone(local),remote=null,applied=0;const states=[];
const engine=createSyncEngine({autoMigrate:true,mergeInitialData,
    storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    readLocal:()=>current,applyCloud:data=>{current=data;applied++;},validate:JSON.parse,onState:s=>states.push(s),
    remote:{read:async()=>remote,write:async(uid,revision,payload)=>{remote={schema:1,revision:revision+1,payload};}}
});
engine.connect('alice');await engine.sync();
assert.equal(states.at(-1).status,'synced','first login uploads automatically');assert.equal(remote.revision,1);
assert.equal(storage.get(SYNC_RECOVERY_KEY),canonicalJson(local),'migration saves recovery before upload');
storage.delete(SYNC_META_KEY);current=structuredClone(cloud);engine.connect('alice');await engine.sync();
assert.equal(states.at(-1).status,'synced');assert.equal(applied,1);assert.equal(current.todoList.length,2,'initial cloud and device content are combined');
engine.connect('bob');await engine.sync();assert.equal(states.at(-1).status,'choice','a different account never inherits another account data automatically');

assert.equal(shouldShowSyncPrompt({},0),true);
assert.equal(shouldShowSyncPrompt({nextPromptAt:REMINDER_INTERVAL},REMINDER_INTERVAL-1),false);
assert.equal(shouldShowSyncPrompt({nextPromptAt:REMINDER_INTERVAL},REMINDER_INTERVAL),true);
assert.equal(shouldShowSyncPrompt({optedOut:true},REMINDER_INTERVAL*2),false);
console.log('PASS: automatic migration, content preservation, duplicate IDs, empty-device restore, account boundaries and reminder scheduling');
