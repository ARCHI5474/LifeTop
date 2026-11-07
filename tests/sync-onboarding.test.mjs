import assert from 'node:assert/strict';
import {initSyncOnboarding} from '../js/sync-onboarding.js?v=9.0';
const elements=new Map();
let loginCalls=0,accountCalls=0;
const element=id=>{
    if(!elements.has(id))elements.set(id,{id,hidden:false,open:false,isConnected:true,textContent:'',dataset:{},listeners:{},
        addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},
        showModal(){this.open=true;},close(){this.open=false;},
        click(){this.listeners.click?.();}
    });
    return elements.get(id);
};
globalThis.document={activeElement:{isConnected:true,focus(){}},getElementById:id=>element(id)};
try{
    const guide=initSyncOnboarding({login:()=>loginCalls++,openAccount:()=>accountCalls++});
    guide.setUser(null);
    assert.equal(element('sync-guide').open,false,'login prompt stays closed until requested');
    element('cloud-sync-guide').click();
    assert.equal(element('sync-guide').open,true,'sync help can still be opened from settings');
    assert.match(element('sync-guide-progress').textContent,/1 \/ 3/);
    element('sync-guide-primary').click();element('sync-guide-primary').click();
    assert.match(element('sync-guide-progress').textContent,/3 \/ 3/);
    element('sync-guide-primary').click();assert.equal(loginCalls,1);
    guide.setBusy(true);element('sync-guide-primary').click();assert.equal(loginCalls,1);
    guide.setBusy(false);guide.showError('キャンセル');assert.equal(element('sync-guide-error').textContent,'キャンセル');
    guide.setUser({uid:'alice'});assert.equal(element('sync-guide').open,false);
    guide.setStatus('synced');assert.match(element('cloud-save-mode').textContent,/クラウドに保存済み/);
    element('cloud-sync-guide').click();
    element('sync-guide-primary').click();element('sync-guide-primary').click();element('sync-guide-primary').click();
    assert.equal(accountCalls,1,'signed-in users can open account settings from manual sync help');
    guide.setUser(null);assert.equal(element('sync-guide').open,false,'auth state changes never open the prompt');
    console.log('PASS: no automatic login prompt, manual sync help, login action, errors and account action');
}finally{delete globalThis.document;}
