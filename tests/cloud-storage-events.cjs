const assert = require('node:assert/strict');
const {withApp} = require('./helpers/browser.cjs');

withApp(async (page, context) => {
    await context.route(/\/js\/firebase-adapter\.js(?:\?.*)?$/,route => route.fulfill({contentType:'text/javascript',body:`export async function createFirebaseAdapter(){return {onAuth(callback){callback(null);return ()=>{};},signOut:async()=>{},signIn:async()=>{}};}`}));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#cloud-sync-account').textContent==='未ログイン');
    await page.locator('[data-tab=memo]').click();
    await page.locator('#memo-editor').fill('新しい保存済みの本文');
    await page.locator('[data-tab=todo]').click();
    await page.evaluate(() => {
        const latest=JSON.parse(localStorage.getItem('lifetop_v1_0_data'));
        window.dispatchEvent(new StorageEvent('storage',{key:'lifetop_v1_0_data',newValue:JSON.stringify({...latest,memo:'古いイベント本文',memoHtml:'古いイベント本文'})}));
    });
    await page.locator('[data-tab=memo]').click();
    assert.equal(await page.locator('#memo-editor').innerText(),'新しい保存済みの本文','queued storage events must read the latest persisted snapshot');
    await page.locator('#memo-editor').focus();
    await page.evaluate(() => {
        document.querySelector('#memo-editor').textContent='編集中の未確定本文';
        const key='lifetop_v1_0_data', latest=JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key,JSON.stringify({...latest,username:'別タブの設定'}));
        window.dispatchEvent(new StorageEvent('storage',{key,newValue:JSON.stringify({...latest,username:'別タブの設定'})}));
    });
    assert.equal(await page.locator('#memo-editor').innerText(),'編集中の未確定本文','storage notifications must not replace an active editor');
    console.log('PASS: queued storage events cannot restore stale text or replace active edits');
}).catch(error => {console.error(error);process.exitCode=1;});
