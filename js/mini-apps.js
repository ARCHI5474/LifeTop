import {initUISystem} from './ui-system.js?v=10.0-ui5';
import { apps } from './mini-model.js?v=1';
import {readCanvas,saveStudioFile} from './canvas-model.js';
import {initFestivalEntry} from './festival-entry.js';
import { makeContext,download,esc } from './mini-common.js?v=1';
import { documentApp,sheetApp,slidesApp } from './mini-office.js?v=1';
import { imageApp,pdfApp,audioApp,videoApp } from './mini-media.js?v=1';
import { dataApp,compareApp,textApp,unitsApp,diagramApp,drawApp,submitApp } from './mini-tools.js?v=1';

const mounts={document:documentApp,sheet:sheetApp,slides:slidesApp,image:imageApp,pdf:pdfApp,audio:audioApp,video:videoApp,diagram:diagramApp,data:dataApp,compare:compareApp,text:textApp,units:unitsApp,draw:drawApp,submit:submitApp};
const hasApp=id=>Object.hasOwn(mounts,id);
const $=id=>document.getElementById(id),memory=new Map();
let active=null,context=null,snapshot=null,timer=null,dbPromise=null,writeQueue=Promise.resolve(),opening=false;
const fileVersions=new Map();
let workspaceUpdatedAt,workspaceFile=null,undoStack=[],redoStack=[],historyState=null,restoring=false;
function historyRecord(){if(!snapshot||restoring)return;const next=JSON.stringify(snapshot());if(next!==historyState){if(historyState!==null)undoStack.push(historyState);if(undoStack.length>30)undoStack.shift();historyState=next;redoStack=[];}historyButtons();}
function historyButtons(){$('studio-undo').disabled=!undoStack.length;$('studio-redo').disabled=!redoStack.length;}
async function restoreHistory(redo=false){historyRecord();const source=redo?redoStack:undoStack,target=redo?undoStack:redoStack;if(!source.length||opening)return;if(['image','pdf','video','audio','submit'].includes(active)&&!confirm('設定を復元します。元の素材ファイルは選択し直す必要があります。続けますか？'))return;const value=source.pop();target.push(JSON.stringify(snapshot()));restoring=true;try{context?.dispose();context=makeContext($('mini-content'),notify,changed,()=>($('mini-name').value||'無題'));context.send=(id,state)=>openApp(id,state);snapshot=mounts[active](context,JSON.parse(value));historyState=value;context.root.addEventListener('input',changed);context.root.addEventListener('change',changed);await save();historyButtons();}finally{restoring=false;}}
const notify=(message,error=false)=>{ $('mini-status').textContent=message;$('mini-status').dataset.error=String(error); };
function database() {
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('端末内保存に対応していません。'));return;}const request=indexedDB.open('lifetop-mini-apps',2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('projects'))request.result.createObjectStore('projects',{keyPath:'app'});if(!request.result.objectStoreNames.contains('recovery'))request.result.createObjectStore('recovery',{keyPath:'app'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('ほかのタブを閉じてください。'));});
    return dbPromise;
}
async function read(app){if(memory.has(app))return memory.get(app);try{const db=await database();return await new Promise((resolve,reject)=>{const req=db.transaction('projects').objectStore('projects').get(app);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch{return null;}}
function save() {
    clearTimeout(timer);if(!active||!snapshot)return Promise.resolve();
    let project;try{project={format:'lifetop-mini',version:1,app:active,name:$('mini-name').value.trim()||'無題',state:snapshot(),updatedAt:Date.now()};project=JSON.parse(JSON.stringify(project));}catch(error){notify('作業を保存できません。'+error.message,true);return Promise.resolve();}
    const fileId=workspaceFile;memory.set(active,project);
    writeQueue=writeQueue.catch(()=>{}).then(async()=>{try{const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction(['projects','recovery'],'readwrite'),store=tx.objectStore('projects'),previous=store.get(project.app);previous.onsuccess=()=>{if(previous.result&&(previous.result.name!==project.name||JSON.stringify(previous.result.state)!==JSON.stringify(project.state)))tx.objectStore('recovery').put(previous.result);store.put(project);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});if(fileId){const saved=await saveStudioFile(project,fileId,fileVersions.get(fileId));fileVersions.set(fileId,saved.updatedAt);if(workspaceFile===fileId)workspaceUpdatedAt=saved.updatedAt;}notify('端末に自動保存しました。元の動画・音声・画像は別途保管してください。');}catch(error){notify('自動保存の一部に失敗しました。「作業ファイルを保存」でバックアップしてください。'+error.message,true);}});
    return writeQueue;
}
const changed=()=>{historyRecord();notify('未保存の変更があります。');clearTimeout(timer);timer=setTimeout(()=>{historyRecord();void save();},450);};
async function openApp(id,override) {
    if(!hasApp(id)||opening)return;opening=true;$('mini-content').hidden=true;
    try{
        await save();context?.dispose();context=null;snapshot=null;
        const project=override?{state:override,name:$('mini-name').value}:await read(id);
        active=id;const info=apps.find(app=>app.id===id);
        if(!restoring){undoStack=[];redoStack=[];workspaceFile=null;}
        $('mini-home').hidden=true;$('mini-workspace').hidden=false;$('mini-title').textContent=info.name;$('mini-description').textContent=info.description;$('mini-picker').value=id;$('mini-name').value=project?.name||'無題';
        context=makeContext($('mini-content'),notify,changed,()=>($('mini-name').value.trim()||'無題').replace(/[<>:"/\\|?*]/g,'_'));
        context.send=(target,state)=>openApp(target,state);
        snapshot=mounts[id](context,project?.state&&typeof project.state==='object'?project.state:{});
        historyState=JSON.stringify(snapshot());historyButtons();
        context.root.addEventListener('input',changed);context.root.addEventListener('change',changed);
        history.replaceState(null,'','#'+id);notify(`${info.name}を開きました。`);window.scrollTo({top:0,behavior:'instant'});
    }catch(error){context?.dispose();snapshot=null;$('mini-content').textContent='この作業を開けませんでした。作業ファイルの内容を確認してください。';notify(error.message,true);}
    finally{opening=false;$('mini-content').hidden=false;}
}
$('mini-catalog').innerHTML=apps.map((app,index)=>`<button class="mini-app-card" data-app="${app.id}"><small>${String(index+1).padStart(2,'0')} / ${app.category}</small><strong>${app.name}</strong><span>${app.description}</span></button>`).join('');
$('mini-picker').innerHTML=apps.map(app=>`<option value="${app.id}">${app.name}</option>`).join('');
$('mini-catalog').addEventListener('click',event=>{const card=event.target.closest('[data-app]');if(card)void openApp(card.dataset.app);});
$('mini-picker').addEventListener('change',()=>void openApp($('mini-picker').value));
let catalogPage=0;
const pager=document.createElement('nav');pager.className='studio-pager';pager.setAttribute('aria-label','アプリ一覧のページ');
pager.innerHTML='<button type="button" class="tonal-btn">前へ</button><output aria-live="polite"></output><button type="button" class="tonal-btn">次へ</button>';
$('mini-catalog').after(pager);
function pageCatalog(){const query=$('mini-filter').value.trim().toLowerCase(),cards=[...$('mini-catalog').children],matched=cards.filter(c=>c.textContent.toLowerCase().includes(query));const embedded=new URLSearchParams(location.search).has('embedded'),size=embedded?(innerHeight<350?(innerWidth<640?2:3):innerWidth<640?4:6):cards.length,pages=Math.max(1,Math.ceil(matched.length/size));catalogPage=Math.min(catalogPage,pages-1);cards.forEach(c=>c.hidden=true);matched.slice(catalogPage*size,(catalogPage+1)*size).forEach(c=>c.hidden=false);pager.hidden=!embedded||pages===1;pager.querySelector('output').textContent=(catalogPage+1)+' / '+pages;pager.firstElementChild.disabled=catalogPage===0;pager.lastElementChild.disabled=catalogPage===pages-1;$('mini-no-results').hidden=matched.length>0;}
pager.firstElementChild.onclick=()=>{catalogPage--;pageCatalog();};pager.lastElementChild.onclick=()=>{catalogPage++;pageCatalog();};
$('mini-filter').addEventListener('input',()=>{catalogPage=0;pageCatalog();});window.addEventListener('resize',pageCatalog);pageCatalog();
$('mini-name').addEventListener('input',changed);
$('mini-home-button').addEventListener('click',async()=>{if(opening)return;await save();context?.dispose();context=null;snapshot=null;active=null;$('mini-workspace').hidden=true;$('mini-home').hidden=false;history.replaceState(null,'',location.pathname);$('mini-filter').focus();notify('使いたいアプリを選んでください。');});
$('mini-project-save').addEventListener('click',()=>{if(!active||!snapshot)return;const name=$('mini-name').value.trim()||'無題';download(JSON.stringify({format:'lifetop-mini',version:1,app:active,name,state:snapshot()},null,2),name.replace(/[<>:"/\\|?*]/g,'_')+'.lifetop.json','application/json');void save();});
$('mini-project-open').addEventListener('change',async()=>{const file=$('mini-project-open').files[0];if(!file)return;try{if(file.size>15*1024**2)throw new Error('作業ファイルは15MBまでです。素材は別途選択してください。');const project=JSON.parse(await file.text());if(project.format!=='lifetop-mini'||project.version!==1||!hasApp(project.app)||!project.state||typeof project.state!=='object'||Array.isArray(project.state))throw new Error('対応するLifeTop作業ファイルではありません。');await openApp(project.app,project.state);$('mini-name').value=String(project.name||'無題').slice(0,80);changed();notify('作業ファイルを開きました。素材が必要なアプリでは元ファイルを選んでください。');}catch(error){notify(error.message,true);}finally{$('mini-project-open').value='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void save();});
window.addEventListener('pagehide',()=>{void save();context?.dispose();});
const studioBar=document.createElement('div');studioBar.className='mini-tools';studioBar.innerHTML=`<button type="button" class="tonal-btn" id="studio-undo" disabled>Undo</button><button type="button" class="tonal-btn" id="studio-redo" disabled>Redo</button><button type="button" class="tonal-btn" id="studio-new">新規ファイル</button><button type="button" class="tonal-btn" id="studio-recover">前の自動保存を復元</button><button type="button" class="tonal-btn" id="studio-workspace-save">ファイル一覧に保存</button><a class="text-btn" href="index.html">保存済みファイル</a><button type="button" class="tonal-btn" id="studio-template-save">テンプレートとして保存</button><label>テンプレート<select id="studio-template"><option value="">選択</option></select></label>`;$('mini-workspace').insertBefore(studioBar,$('mini-content'));
$('studio-recover').onclick=async()=>{try{if(!active||!confirm('前の自動保存を復元しますか？現在の作業は作業ファイルとしてダウンロードしてください。'))return;const db=await database(),project=await new Promise((resolve,reject)=>{const tx=db.transaction('recovery'),r=tx.objectStore('recovery').get(active);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});if(!project)throw Error('復元データはまだありません。');if(snapshot)download(JSON.stringify({format:'lifetop-mini',version:1,app:active,name:$('mini-name').value,state:snapshot()}),'before-recovery.lifetop.json','application/json');await openApp(active,project.state);$('mini-name').value=project.name;changed();}catch(e){notify(e.message,true);}};
$('studio-undo').onclick=()=>void restoreHistory().catch(e=>notify(e.message,true));$('studio-redo').onclick=()=>void restoreHistory(true).catch(e=>notify(e.message,true));
$('studio-new').onclick=async()=>{if(!active||opening)return;$('studio-new').disabled=true;$('mini-content').hidden=true;try{await save();if(!workspaceFile)await saveStudioFile({format:'lifetop-mini',version:1,app:active,name:$('mini-name').value||'無題',state:snapshot()});await openApp(active,{});$('mini-name').value='無題';const saved=await saveStudioFile({format:'lifetop-mini',version:1,app:active,name:'無題',state:snapshot()});workspaceFile=saved.id;workspaceUpdatedAt=saved.updatedAt;fileVersions.set(saved.id,saved.updatedAt);changed();}catch(e){notify(e.message,true);}finally{$('studio-new').disabled=false;$('mini-content').hidden=false;}};
$('studio-workspace-save').onclick=async()=>{try{if(!active||!snapshot)return;await save();const saved=await saveStudioFile({format:'lifetop-mini',version:1,app:active,name:$('mini-name').value.trim()||'無題',state:snapshot()},workspaceFile,workspaceUpdatedAt);workspaceFile=saved.id;workspaceUpdatedAt=saved.updatedAt;fileVersions.set(saved.id,saved.updatedAt);notify('ファイル一覧に保存しました。複数のファイルをホームから管理できます。');}catch(e){notify(e.message,true);}};
async function templates(){const state=await readCanvas();$('studio-template').innerHTML='<option value="">選択</option>'+state.files.filter(f=>f.template&&!f.deletedAt).map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');}
$('studio-template-save').onclick=async()=>{try{if(!snapshot)return;await saveStudioFile({format:'lifetop-mini',version:1,app:active,name:$('mini-name').value||'テンプレート',state:snapshot(),template:true});await templates();notify('テンプレートを保存しました。');}catch(e){notify(e.message,true);}};
$('studio-template').onchange=async()=>{try{const state=await readCanvas(),file=state.files.find(f=>f.id===$('studio-template').value&&!f.deletedAt);if(!file)return;await openApp(file.app,file.state);$('mini-name').value=file.name+' コピー';workspaceFile=null;changed();}catch(e){notify(e.message,true);}};
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||!active)return;const key=e.key.toLowerCase();if(key==='s'){e.preventDefault();void save();}if(key==='z'&&!e.target.closest('input,textarea,[contenteditable=true]')){e.preventDefault();void restoreHistory(e.shiftKey).catch(e=>notify(e.message,true));}if(key==='y'&&!e.target.closest('input,textarea,[contenteditable=true]')){e.preventDefault();void restoreHistory(true).catch(e=>notify(e.message,true));}});
async function startStudio(){try{await templates();}catch{}try{const fileId=new URLSearchParams(location.search).get('file');if(fileId){const data=await readCanvas(),file=data.files.find(f=>f.id===fileId&&!f.deletedAt&&!data.projects.find(p=>p.id===f.projectId)?.deletedAt);if(!file||!hasApp(file.app))throw Error('ファイルが見つかりません。');await openApp(file.app,file.state);workspaceFile=file.id;workspaceUpdatedAt=file.updatedAt;fileVersions.set(file.id,file.updatedAt);$('mini-name').value=file.name;changed();}else if(hasApp(location.hash.slice(1)))await openApp(location.hash.slice(1));}catch(e){notify(e.message,true);}}
void startStudio();

void initFestivalEntry();

initUISystem();

if(new URLSearchParams(location.search).has('embedded')){
 document.body.classList.add('mini-embedded');
 document.querySelector('.mini-header')?.remove();
 document.querySelectorAll('a[href="index.html"]').forEach(link=>link.remove());
}

window.flushMiniApp=async()=>{clearTimeout(timer);await save();if($('mini-status').dataset.error==='true')throw Error('保存を確認してください。');};
