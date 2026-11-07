import {test} from 'node:test';
import assert from 'node:assert/strict';
import {huntSpots} from '../js/festival-hunt-spots.js';
import {findHiddenTen} from '../js/festival-hunt-model.js';
import {emptyFestival,validateFestival,DAY_MS} from '../js/festival-model.js';
const start=Date.parse('2026-11-07T14:11:54+09:00'),config={startAt:'2026-11-07T14:11:54+09:00',durationDays:10};
test('ten unique hiding spots; discoveries are independent and idempotent',()=>{
 assert.equal(huntSpots.length,10);assert.equal(new Set(huntSpots.map(s=>s.id)).size,10);
 const s=emptyFestival();findHiddenTen(s,config,'clock',start);findHiddenTen(s,config,'clock',start+1000);
 assert.equal(s.hideAndSeek.found.clock,start);assert.equal(Object.keys(s.hideAndSeek.found).length,1);
 assert.equal(s.eggs.home,undefined);
 for(const spot of huntSpots)findHiddenTen(s,config,spot.id,start+1000);
 assert.equal(Object.keys(s.hideAndSeek.found).length,10);assert.equal(s.eggs.home,start+1000);
 assert.doesNotThrow(()=>validateFestival(JSON.parse(JSON.stringify(s))));
});
test('before/after event cannot discover; existing records are retained',()=>{
 const s=emptyFestival();findHiddenTen(s,config,'clock',start);const previous=structuredClone(s);
 for(const now of [start-1,start+10*DAY_MS])assert.throws(()=>findHiddenTen(s,config,'search',now));
 assert.throws(()=>findHiddenTen(s,config,'unknown',start));assert.deepEqual(s,previous);
});
test('old saves and old number-board records remain valid; malformed discoveries rejected',()=>{
 const s=emptyFestival();assert.doesNotThrow(()=>validateFestival(s));s.hunt={bestMs:2345,plays:2,at:start};assert.doesNotThrow(()=>validateFestival(s));
 for(const found of [[],null,{'unknown':start},{clock:'bad'}])assert.throws(()=>validateFestival({...s,hideAndSeek:{found}}));
});
