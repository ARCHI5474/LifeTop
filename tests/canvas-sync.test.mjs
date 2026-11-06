import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyCanvas} from '../js/canvas-model.js';
import {selectedCanvas,parseCanvasCloud} from '../js/canvas-sync.js';
test('sync off does not produce an upload; selected groups exclude unrelated data',()=>{const s=emptyCanvas();assert.throws(()=>selectedCanvas(s));s.sync={mode:'selected',groups:['calendar']};s.events=[{id:'e',title:'test',start:'2026-11-06T10:00:00Z',end:'2026-11-06T11:00:00Z',repeat:'none'}];const payload=selectedCanvas(s);assert.deepEqual(Object.keys(payload.data),['events']);assert.deepEqual(parseCanvasCloud(JSON.stringify(payload)),payload);s.sync.mode='all';assert.equal(Object.keys(selectedCanvas(s).data).length,8);assert.throws(()=>parseCanvasCloud(JSON.stringify({...payload,data:{...payload.data,files:[]}})));assert.throws(()=>parseCanvasCloud(JSON.stringify({...payload,selection:['unknown']})));});
