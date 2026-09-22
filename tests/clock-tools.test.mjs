import assert from 'node:assert/strict';

let now = 0, next = 0;
const callbacks = new Map(), elements = new Map();
const element = id => {
 if (!elements.has(id)) elements.set(id, {innerText:'', innerHTML:'', setAttribute(){}, classList: { values: new Set(), add(v){this.values.add(v)}, remove(v){this.values.delete(v)}, contains(v){return this.values.has(v)} } });
 return elements.get(id);
};
globalThis.document = {getElementById: element};
Date.now = () => now;
globalThis.performance = {now: () => now};
globalThis.setInterval = fn => { callbacks.set(++next, fn); return next; };
globalThis.clearInterval = id => callbacks.delete(id);
let created = 0, resumed = 0, sounded = 0, stopped = 0;
class AudioContext {
 constructor(){created++; this.state='suspended'; this.currentTime=0;}
 resume(){resumed++; this.state='running'; return Promise.resolve();}
 createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){sounded++},stop(){stopped++}}}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
}
globalThis.window = {AudioContext};
const clock = await import('../js/clock-tools.js');
const tick = ms => { now += ms; for (const fn of [...callbacks.values()]) fn(); };
clock.initClockTools();
assert.equal(element('timer-display').innerText, '05:00');
clock.setTimerPreset(1); clock.startTimer();
assert.equal(created, 1); assert.equal(resumed, 1);
tick(400); clock.pauseTimer(); tick(5000);
clock.startTimer(); tick(59600);
assert.equal(element('timer-display').innerText, '00:00');
assert(element('timer-alarm-banner').classList.contains('active'));
assert.equal(created, 1); assert.equal(sounded, 2);
clock.stopAlarmSound();
assert(!element('timer-alarm-banner').classList.contains('active'));
assert(stopped >= 4); assert.equal(callbacks.size, 0);
clock.resetTimer(); assert.equal(element('timer-display').innerText, '01:00');
clock.adjustTimer(-600); assert.equal(element('timer-display').innerText, '00:10');
clock.startStopwatch(); now += 1234; clock.recordLap();
assert.match(element('stopwatch-laps').innerHTML, /00:01.23/);
now += 111; clock.pauseStopwatch();
assert.equal(element('stopwatch-display').innerText, '00:01.34');
tick(1000); clock.startStopwatch(); now += 655; clock.pauseStopwatch();
assert.equal(element('stopwatch-display').innerText, '00:02.00');
clock.resetStopwatch(); assert.equal(element('stopwatch-laps').innerHTML, '');
assert.equal(element('stopwatch-display').innerText, '00:00.00');
clock.setTimerPreset(1); clock.startTimer(); tick(65000);
assert.equal(element('timer-display').innerText, '00:00');
clock.stopAlarmSound();
console.log('PASS: timer pause/resume, delayed tick, alarm initialization/stop, presets, stopwatch accuracy, laps, reset');


