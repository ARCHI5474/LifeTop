import assert from 'node:assert/strict';
import {userConfig,mergeUserConfig} from '../js/config.js?v=9.0';
import {createBackup,parseBackup} from '../js/data-management.js?v=9.0';

const medications=[{id:'legacy-a',name:'旧データA',taken:true,dose:'1'},{id:'legacy-b',name:'旧データB',taken:false}];
mergeUserConfig({healthLog:{meals:{'2026-11-07':{breakfast:true}},medications}});
assert.deepEqual(userConfig.healthLog.medications,medications,'legacy medications must survive loading when current defaults are empty');
const backup=parseBackup(createBackup());
assert.deepEqual(backup.healthLog.medications,medications,'backup round trip preserves legacy records');
mergeUserConfig(backup);
assert.deepEqual(userConfig.healthLog.medications,medications,'repeated loading does not duplicate records');
mergeUserConfig({healthLog:{medications:[]}});
assert.deepEqual(userConfig.healthLog.medications,[],'an explicitly empty saved list remains empty');
console.log('PASS: legacy medication records, backup round trip and explicit empty list');
