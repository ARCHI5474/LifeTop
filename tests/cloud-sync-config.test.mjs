import assert from 'node:assert/strict';
import {cloudSyncConfig} from '../js/firebase-config.js?v=8.0';
import {initCloudSync} from '../js/cloud-sync.js?v=8.0';

const enabled = cloudSyncConfig.enabled;
cloudSyncConfig.enabled = false;
const controls=new Map();
globalThis.document={getElementById(id){if(!controls.has(id))controls.set(id,{hidden:true,textContent:''});return controls.get(id);}};
globalThis.fetch=()=>{throw Error('an unconfigured app must not use cloud services');};
try {
    await initCloudSync(()=>{throw Error('local data must remain untouched');});
} finally {
    cloudSyncConfig.enabled = enabled;
}
assert.match(controls.get('cloud-sync-status').textContent,/準備中/);
assert.equal(controls.get('cloud-sync-login').hidden,true);
console.log('PASS: unconfigured cloud sync preserves local mode and never loads Firebase');
