import assert from 'node:assert/strict';
import { initMotion } from '../js/motion.js?v=8.0';
const events = new Map();
let reduce = false;
globalThis.Element = class {};
globalThis.window = { matchMedia: () => ({matches:false,addEventListener(){}}), addEventListener(){} };
globalThis.document = {
    documentElement: {classList:{contains:()=>reduce}}, body:{},
    querySelectorAll:()=>[], fonts:{ready:Promise.resolve()},
    addEventListener(name, fn){events.set(name,fn);}
};
globalThis.MutationObserver = class {observe(){}};
globalThis.ResizeObserver = class {observe(){} unobserve(){}};
globalThis.requestAnimationFrame = () => {};
globalThis.getComputedStyle = element => ({scale:element.currentScale});
const frames = [];
let cancellations = 0;
class Control extends Element {
    isConnected = true;
    currentScale = 'none';
    closest(selector){ return selector.startsWith('.puzzle') ? null : this; }
    matches(){return false;}
    querySelector(){return null;}
    animate(keyframes){
        frames.push(keyframes);
        return {cancel(){cancellations++;},finished:new Promise(()=>{})};
    }
}
initMotion();
const control = new Control();
const event = {isPrimary:true,button:0,pointerId:1,clientX:0,clientY:0,target:control};
events.get('pointerdown')(event);
assert.equal(frames[0][0].scale,'1');
control.currentScale = '.985 .975';
events.get('pointerup')({...event,type:'pointerup'});
assert.equal(frames[1][0].scale,'.985 .975','release starts at the interrupted visual scale, without snapping');
assert.equal(cancellations,1);
control.currentScale = '1.01 1.005';
events.get('pointerdown')(event);
assert.equal(frames[2][0].scale,'1.01 1.005','a rapid second press continues from the ongoing bounce');
events.get('pointercancel')({...event,type:'pointercancel'});
assert.equal(frames.at(-1).at(-1).scale,'1','cancelling a pointer restores normal scale');
reduce = true;
const count = frames.length;
events.get('pointerdown')(event);
assert.equal(frames.length,count,'reduced motion skips press animation');
console.log('PASS: interrupted release, rapid press, pointer cancellation and reduced motion');
