const assert=require('node:assert/strict');const{withApp,quickDetails}=require('./helpers/browser.cjs');
withApp(async (page,context)=>{
 await page.locator('#live-home-canvas').waitFor({state:'attached'});await quickDetails(page,'appearance');
 await page.locator('#live-home-scene').selectOption('ripple');await page.locator('#live-home-enabled').uncheck();assert.equal(await page.locator('#live-home-canvas').count(),0);await page.locator('#live-home-enabled').check();
 await page.reload();await page.locator('#loading-screen').waitFor({state:'detached'});await quickDetails(page,'appearance');assert.equal(await page.locator('#live-home-scene').inputValue(),'ripple');
 await page.evaluate(()=>{window.stops=0;const c=new AudioContext(),osc=c.createOscillator(),dest=c.createMediaStreamDestination();osc.connect(dest);osc.start();for(const track of dest.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stops++;stop();osc.stop();void c.close();};}Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>dest.stream}});});
 await page.locator('#live-home-mic').click();await page.locator('#live-home-audio-status').filter({hasText:'マイクに反応中'}).waitFor();await page.locator('#live-home-audio-stop').click();assert.equal(await page.evaluate(()=>stops),1);
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});await page.locator('#live-home-mic').click();await page.locator('#live-home-audio-status').filter({hasText:'許可されませんでした'}).waitFor();
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.late=resolve);});await page.locator('#live-home-mic').click();await page.waitForFunction(()=>typeof late==='function');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));window.lateStops=0;late({getTracks:()=>[{stop:()=>lateStops++}]});});await page.waitForFunction(()=>lateStops===1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('body').evaluate(n=>getComputedStyle(n).isolation),'isolate');
 await page.locator('#live-home-enabled').uncheck();
 await page.evaluate(()=>{
  const save=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key==='lifetop_live_home_v1')throw new DOMException('quota','QuotaExceededError');
   return save.call(this,key,value);
  };
  window.unexpectedMicRequests=0;
  navigator.mediaDevices.getUserMedia=async()=>{unexpectedMicRequests++;throw new Error('unexpected');};
 });
 await page.locator('#live-home-mic').click();
 assert.equal(await page.evaluate(()=>unexpectedMicRequests),0,'failed Live activation must not request a microphone');
 await page.keyboard.press('Escape');await page.locator('#settings-panel').waitFor({state:'hidden'});
 await context.route('**/js/google-session.js?*',route=>route.fulfill({contentType:'text/javascript',body:`
 const user={uid:'alice',providerData:[{providerId:'google.com'}]};
 window.authCallbacks=[];
 window.finishLiveAuth=null;
 export function googleSession(){
  return new Promise(resolve=>window.finishLiveAuth=()=>resolve({
   auth:{currentUser:user},
   watch(callback){window.authCallbacks.push(callback);callback(user);return()=>{};}
  }));
 }`}));
 await context.route('**/js/chat-service.js?*',route=>route.fulfill({contentType:'text/javascript',body:`
 export function createChatService(){return {calibrate:async()=>{},presence:async()=>{},roomRef:()=>{throw Error('offline test');}};}
 `}));
 await page.addInitScript(()=>{
  localStorage.setItem('lifetop_live_home_v1','true');
  localStorage.setItem('lifetop_live_room_v13','old-room');
  const disconnect=ResizeObserver.prototype.disconnect;
  window.resizeDisconnects=0;
  ResizeObserver.prototype.disconnect=function(){resizeDisconnects++;return disconnect.call(this);};
 });
 await page.reload();
 await page.waitForFunction(()=>typeof finishLiveAuth==='function');
 await page.evaluate(()=>{
  window.liveChannel=new BroadcastChannel('lifetop-room');
  liveChannel.postMessage({roomId:''});
  liveChannel.postMessage({roomId:'new-room'});
  window.previousLiveAuth=finishLiveAuth;
 });
 await page.waitForFunction(()=>finishLiveAuth!==previousLiveAuth);
 await page.evaluate(()=>previousLiveAuth());
 assert.equal(await page.evaluate(()=>authCallbacks.length),0,'obsolete authentication must not install a room watcher');
 await page.evaluate(()=>finishLiveAuth());
 await page.waitForFunction(()=>authCallbacks.length===1);
 const beforeRestore=await page.evaluate(()=>resizeDisconnects);
 await page.evaluate(()=>{
  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  liveChannel.postMessage({roomId:'restored-room'});
  window.previousLiveAuth=finishLiveAuth;
 });
 assert.equal(await page.evaluate(()=>resizeDisconnects),beforeRestore,'back/forward cache must retain the Live scene observer');
 await page.waitForFunction(()=>finishLiveAuth!==previousLiveAuth);
 console.log('PASS: Live is on home, wallpaper persistence/restore, mic lifecycle/denial/late permission, reduced-visibility behavior and protected background stacking');
}).catch(e=>{console.error(e);process.exitCode=1;});
