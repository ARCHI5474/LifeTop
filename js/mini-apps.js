import { apps } from './mini-model.js?v=1';
import { makeContext,download,esc } from './mini-common.js?v=1';
import { documentApp,sheetApp,slidesApp } from './mini-office.js?v=1';
import { imageApp,pdfApp,audioApp,videoApp } from './mini-media.js?v=1';
import { dataApp,compareApp,textApp,unitsApp,diagramApp,drawApp,submitApp } from './mini-tools.js?v=1';

const mounts={document:documentApp,sheet:sheetApp,slides:slidesApp,image:imageApp,pdf:pdfApp,audio:audioApp,video:videoApp,diagram:diagramApp,data:dataApp,compare:compareApp,text:textApp,units:unitsApp,draw:drawApp,submit:submitApp};
const hasApp=id=>Object.hasOwn(mounts,id);
const $=id=>document.getElementById(id),memory=new Map();
let active=null,context=null,snapshot=null,timer=null,dbPromise=null,writeQueue=Promise.resolve(),opening=false;
const notify=(message,error=false)=>{ $('mini-status').textContent=message;$('mini-status').dataset.error=String(error); };
function database() {
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('端末内保存に対応していません。'));return;}const request=indexedDB.open('lifetop-mini-apps',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'app'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('ほかのタブを閉じてください。'));});
    return dbPromise;
}
async function read(app){if(memory.has(app))return memory.get(app);try{const db=await database();return await new Promise((resolve,reject)=>{const req=db.transaction('projects').objectStore('projects').get(app);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch{return null;}}
function save() {
    clearTimeout(timer);if(!active||!snapshot)return Promise.resolve();
    let project;try{project={format:'lifetop-mini',version:1,app:active,name:$('mini-name').value.trim()||'無題',state:snapshot(),updatedAt:Date.now()};project=JSON.parse(JSON.stringify(project));}catch(error){notify('作業を保存できません。'+error.message,true);return Promise.resolve();}
    memory.set(active,project);
    writeQueue=writeQueue.catch(()=>{}).then(async()=>{try{const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(project);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});notify('端末に自動保存しました。元の動画・音声・画像は別途保管してください。');}catch{notify('端末への自動保存ができません。「作業ファイルを保存」でダウンロードしてください。',true);}});
    return writeQueue;
}
const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>void save(),450);};
async function openApp(id,override) {
    if(!hasApp(id)||opening)return;opening=true;
    try{
        await save();context?.dispose();context=null;snapshot=null;
        const project=override?{state:override,name:$('mini-name').value}:await read(id);
        active=id;const info=apps.find(app=>app.id===id);
        $('mini-home').hidden=true;$('mini-workspace').hidden=false;$('mini-title').textContent=info.name;$('mini-description').textContent=info.description;$('mini-picker').value=id;$('mini-name').value=project?.name||'無題';
        context=makeContext($('mini-content'),notify,changed,()=>($('mini-name').value.trim()||'無題').replace(/[<>:"/\\|?*]/g,'_'));
        context.send=(target,state)=>openApp(target,state);
        snapshot=mounts[id](context,project?.state&&typeof project.state==='object'?project.state:{});
        context.root.addEventListener('input',changed);context.root.addEventListener('change',changed);
        history.replaceState(null,'','#'+id);notify(`${info.name}を開きました。`);window.scrollTo({top:0,behavior:'instant'});
    }catch(error){context?.dispose();snapshot=null;$('mini-content').textContent='この作業を開けませんでした。作業ファイルの内容を確認してください。';notify(error.message,true);}
    finally{opening=false;}
}
$('mini-catalog').innerHTML=apps.map((app,index)=>`<button class="mini-app-card" data-app="${app.id}"><small>${String(index+1).padStart(2,'0')} / ${app.category}</small><strong>${app.name}</strong><span>${app.description}</span></button>`).join('');
$('mini-picker').innerHTML=apps.map(app=>`<option value="${app.id}">${app.name}</option>`).join('');
$('mini-catalog').addEventListener('click',event=>{const card=event.target.closest('[data-app]');if(card)void openApp(card.dataset.app);});
$('mini-picker').addEventListener('change',()=>void openApp($('mini-picker').value));
$('mini-filter').addEventListener('input',()=>{const query=$('mini-filter').value.trim().toLowerCase();let count=0;for(const card of $('mini-catalog').children){card.hidden=!card.textContent.toLowerCase().includes(query);if(!card.hidden)count++;}$('mini-no-results').hidden=count>0;});
$('mini-name').addEventListener('input',changed);
$('mini-home-button').addEventListener('click',async()=>{if(opening)return;await save();context?.dispose();context=null;snapshot=null;active=null;$('mini-workspace').hidden=true;$('mini-home').hidden=false;history.replaceState(null,'',location.pathname);$('mini-filter').focus();notify('使いたいアプリを選んでください。');});
$('mini-project-save').addEventListener('click',()=>{if(!active||!snapshot)return;const name=$('mini-name').value.trim()||'無題';download(JSON.stringify({format:'lifetop-mini',version:1,app:active,name,state:snapshot()},null,2),name.replace(/[<>:"/\\|?*]/g,'_')+'.lifetop.json','application/json');void save();});
$('mini-project-open').addEventListener('change',async()=>{const file=$('mini-project-open').files[0];if(!file)return;try{if(file.size>15*1024**2)throw new Error('作業ファイルは15MBまでです。素材は別途選択してください。');const project=JSON.parse(await file.text());if(project.format!=='lifetop-mini'||project.version!==1||!hasApp(project.app)||!project.state||typeof project.state!=='object'||Array.isArray(project.state))throw new Error('対応するLifeTop作業ファイルではありません。');await openApp(project.app,project.state);$('mini-name').value=String(project.name||'無題').slice(0,80);changed();notify('作業ファイルを開きました。素材が必要なアプリでは元ファイルを選んでください。');}catch(error){notify(error.message,true);}finally{$('mini-project-open').value='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void save();});
window.addEventListener('pagehide',()=>{void save();context?.dispose();});
if(hasApp(location.hash.slice(1)))void openApp(location.hash.slice(1));
