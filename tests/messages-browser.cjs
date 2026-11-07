const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('./helpers/browser.cjs');

const sdk = {
    app: 'export const getApps=()=>[];export const initializeApp=()=>({});',
    auth: `const auth={currentUser:{uid:'alice',isAnonymous:true},authStateReady:async()=>{}};export const getAuth=()=>auth;export const setPersistence=async()=>{};export const browserLocalPersistence={};export const signInAnonymously=async()=>{};`,
    'app-check': 'export class ReCaptchaV3Provider{};export const initializeAppCheck=()=>{};',
    functions: `export const getFunctions=()=>({});export const httpsCallable=()=>async input=>{
      if(input.op==='list')return {data:{rooms:[{id:'a',name:'Room A',members:1},{id:'b',name:'Room B',members:1}]}};
      if(input.op==='send'){window.sent.push(input);return new Promise((resolve,reject)=>{window.resolveSend=()=>resolve({data:{messageId:input.requestId}});window.rejectSend=()=>reject(Error('response lost'));});}
      return {data:{}};
    };`,
    firestore: `export const getFirestore=()=>({});export const doc=(_db,_collection,id)=>({id});export const collection=(_db,_collection,id)=>({id,messages:true});export const where=()=>({});export const orderBy=()=>({});export const limit=()=>({});export const query=ref=>ref;export const Timestamp={fromMillis:value=>value};
    export const onSnapshot=(ref,receive)=>{queueMicrotask(()=>receive(ref.messages?{docs:[]}:{exists:()=>true,data:()=>({name:'Room '+ref.id.toUpperCase(),members:['alice'],owner:'alice'})}));return ()=>{};};`,
};

(async () => {
    const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
    try {
        const context = await browser.newContext();
        const errors = [], failures = [];
        context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'www.gstatic.com') {
                const name = url.pathname.match(/firebase-([^/]+)\.js$/)?.[1];
                return sdk[name] ? route.fulfill({body:sdk[name],contentType:'text/javascript'}) : route.abort();
            }
            if (url.origin !== 'http://localhost') return route.abort();
            if (url.pathname === '/js/messages-config.js') return route.fulfill({contentType:'text/javascript',body:"export const messagesConfig={enabled:true,region:'test',appCheckSiteKey:'fixture'};"});
            const root = path.resolve(__dirname,'..');
            const file = path.resolve(root,'.'+url.pathname);
            if (!file.startsWith(root+path.sep)) return route.abort();
            try { await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.ttf')?'font/ttf':'text/html'}); }
            catch { await route.fulfill({status:404,body:''}); }
        });
        const page = await context.newPage();
        async function connect() {
            await page.goto('http://localhost/messages.html');
            await page.evaluate(()=>{window.sent=[];});
            await page.locator('#messages-nickname').fill('Alice');
            await page.locator('#messages-connect').click();
            await page.getByRole('button',{name:'Room A (1/20)',exact:true}).click();
        }
        await connect();
        await page.locator('#messages-body').fill('first message');
        await page.locator('#messages-send button').click();
        await page.waitForFunction(()=>window.sent.length===1);
        await page.locator('#messages-body').fill('new draft');
        await page.evaluate(()=>window.resolveSend());
        await page.waitForFunction(()=>!document.querySelector('#messages-send button').disabled);
        if (await page.locator('#messages-body').inputValue() !== 'new draft') failures.push('send completion discarded edits made while sending');
        await connect();
        await page.locator('#messages-body').fill('retry safely');
        await page.locator('#messages-send button').click();
        await page.waitForFunction(()=>window.sent.length===1);
        await page.evaluate(()=>window.rejectSend());
        await page.locator('#messages-status').filter({hasText:'response lost'}).waitFor();
        await page.locator('#messages-send button').click();
        await page.waitForFunction(()=>window.sent.length===2);
        if (!await page.evaluate(()=>window.sent[0].requestId===window.sent[1].requestId)) failures.push('lost-response retry used a new server idempotency key');
        await page.getByRole('button',{name:'Room B (1/20)',exact:true}).click();
        await page.locator('#messages-body').fill('Room B draft');
        await page.evaluate(()=>window.resolveSend());
        await page.waitForFunction(()=>!document.querySelector('#messages-send button').disabled);
        if (await page.locator('#messages-body').inputValue() !== 'Room B draft') failures.push('send completion from another room discarded the current draft');
        assert.deepEqual(failures,[],'Messages send safety');
        assert.deepEqual(errors,[]);
        console.log('PASS: pending send preserves later edits and room changes; lost-response retry reuses its idempotency key (local SDK fixture)');
    } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
