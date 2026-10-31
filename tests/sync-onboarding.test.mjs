import assert from 'node:assert/strict';
import {initSyncOnboarding,REMINDER_INTERVAL,SYNC_GUIDE_KEY} from '../js/sync-onboarding.js?v=8.0';
const elements=new Map(),stored=new Map(),timers=[];
let now=10000, loginCalls=0,accountCalls=0,editing=false,otherDialog=false;
const originalNow=Date.now;
Date.now=()=>now;
const element=id=>{
    if(!elements.has(id))elements.set(id,{id,hidden:false,open:false,isConnected:true,textContent:'',dataset:{},listeners:{},
        addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},
        showModal(){this.open=true;},close(){this.open=false;},
        click(){this.listeners.click?.();}
    });
    return elements.get(id);
};
globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
globalThis.document={hidden:false,activeElement:{matches:()=>editing,isConnected:true,focus(){}},
    getElementById:id=>id==='loading-screen'?null:element(id),
    querySelector:()=>otherDialog?{}:null,addEventListener(){}
};
globalThis.setTimeout=fn=>timers.push(fn);
globalThis.setInterval=fn=>timers.push(fn);
try{
    const guide=initSyncOnboarding({login:()=>loginCalls++,openAccount:()=>accountCalls++});
    timers[0]();assert.equal(element('sync-guide').open,false,'wait for auth state before promoting');
    guide.setUser(null);editing=true;timers[0]();assert.equal(element('sync-guide').open,false);
    editing=false;otherDialog=true;timers[0]();assert.equal(element('sync-guide').open,false);
    otherDialog=false;timers[0]();assert.equal(element('sync-guide').open,true);
    assert.match(element('sync-guide-progress').textContent,/1 \/ 3/);
    element('sync-guide-primary').click();element('sync-guide-primary').click();
    assert.match(element('sync-guide-progress').textContent,/3 \/ 3/);
    element('sync-guide-primary').click();assert.equal(loginCalls,1);
    guide.setBusy(true);element('sync-guide-primary').click();assert.equal(loginCalls,1);
    guide.setBusy(false);guide.showError('キャンセル');assert.equal(element('sync-guide-error').textContent,'キャンセル');
    guide.setUser({uid:'alice'});assert.equal(element('sync-guide').open,false);
    guide.setStatus('synced');assert.match(element('header-google-account').textContent,/同期済み/);
    element('header-google-account').click();assert.equal(accountCalls,1);
    now+=REMINDER_INTERVAL+1;timers[1]();assert.equal(element('sync-guide').open,false,'logged-in users get no reminders');
    guide.setUser(null);timers[1]();assert.equal(element('sync-guide').open,true);
    assert.equal(element('sync-guide-progress').textContent,'Google 同期');
    element('sync-guide-later').click();assert.equal(element('sync-guide').open,false);
    timers[1]();assert.equal(element('sync-guide').open,false,'snooze survives repeated checks');
    now+=REMINDER_INTERVAL;timers[1]();assert.equal(element('sync-guide').open,true);
    element('sync-guide-never').click();assert.equal(JSON.parse(stored.get(SYNC_GUIDE_KEY)).optedOut,true);
    now+=REMINDER_INTERVAL*3;timers[1]();assert.equal(element('sync-guide').open,false);
    element('cloud-sync-guide').click();assert.equal(element('sync-guide').open,true,'opt-out does not disable manual help');
    console.log('PASS: tutorial navigation, login action, errors, focus deferral, authenticated suppression, seven-day reminders and opt-out');
}finally{Date.now=originalNow;}
