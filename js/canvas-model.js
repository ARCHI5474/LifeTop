// Connected Canvas uses a separate database; legacy settings and Studio remain intact.
export const emptyCanvas = () => ({schema:1,revision:0,projects:[],folders:[],files:[],events:[],flows:[],runs:[],dashboard:{hidden:['miniCalendar','storage','actions','flow'],order:[],sizes:{},layoutVersion:4},pins:['task','event','document','workspace'],notifications:[]});
export function normalizeTask(task, now=Date.now()) {
    return {...task,description:task.description||'',status:task.completed?'done':(['todo','doing','done'].includes(task.status)?task.status:'todo'),due:task.due||'',projectId:task.projectId||'',fileId:task.fileId||'',createdAt:task.createdAt||now,updatedAt:task.updatedAt||now,completedAt:task.completed?(task.completedAt||now):null};
}
export function validateCanvas(data) {
    const allowed=['schema','revision','projects','folders','files','events','flows','runs','dashboard','pins','notifications','sound','sync'];
    if(data&&Object.keys(data).some(k=>!allowed.includes(k)))throw Error('未対応の保存項目があります。');
    if(!data || data.schema!==1 || !Number.isSafeInteger(data.revision) || data.revision<0) throw Error('対応しない保存形式です。');
    for(const key of ['projects','folders','files','events','flows','runs']) if(!Array.isArray(data[key])) throw Error('保存データを確認してください: '+key);
    for(const key of ['projects','folders','files','events','flows','runs']) if(data[key].length>5000)throw Error('保存件数が上限を超えています。');
    if(!data.dashboard||!Array.isArray(data.dashboard.hidden)||!Array.isArray(data.dashboard.order)||!data.dashboard.sizes||typeof data.dashboard.sizes!=='object'||!Array.isArray(data.pins)||!Array.isArray(data.notifications))throw Error('表示設定が不正です。');
    for(const list of [data.dashboard.hidden,data.dashboard.order,data.pins,data.notifications])if(list.some(x=>typeof x!=='string')||list.length>5000)throw Error('表示設定が不正です。');
    if(data.sync&&(!['off','selected','all'].includes(data.sync.mode)||!Array.isArray(data.sync.groups)||data.sync.groups.some(k=>!['workspace','calendar','flow','dashboard'].includes(k))))throw Error('同期設定が不正です。');
    const ids=new Set();
    for(const item of [...data.projects,...data.folders,...data.files,...data.events,...data.flows]) {
        if(!item || typeof item.id!=='string' || !item.id || ids.has(item.id)) throw Error('保存データのIDが不正です。');
        ids.add(item.id);
    }
    for(const item of [...data.projects,...data.folders,...data.files,...data.flows])if(typeof item.name!=='string'||!item.name.trim()||item.name.length>2000)throw Error('名前を確認してください。');
    for(const p of data.projects)if(!Number.isFinite(p.progress)||p.progress<0||p.progress>100||typeof p.description!=='string')throw Error('プロジェクトが不正です。');
    for(const f of data.folders)if(!data.projects.some(p=>p.id===f.projectId)||!folderTargetValid(data.folders,f.id,f.parentId,f.projectId,true))throw Error('フォルダ階層が不正です。');
    for(const f of data.files)if(f.format!=='lifetop-mini'||f.version!==1||!['document','sheet','slides','image','pdf','video','audio','diagram','data','compare','text','units','draw','submit','diary','convert','browser','code'].includes(f.app)||!f.state||typeof f.state!=='object'||Array.isArray(f.state))throw Error('Studioファイルの形式が不正です。');
    for(const e of data.events)if(typeof e.title!=='string'||!e.title.trim()||!Number.isFinite(Date.parse(e.start))||!Number.isFinite(Date.parse(e.end))||Date.parse(e.end)<Date.parse(e.start)||!['none','daily','weekly','monthly'].includes(e.repeat))throw Error('予定の形式が不正です。');
    for(const f of data.flows)validateFlow(f.blocks);
    for(const run of data.runs)if(!run||typeof run.id!=='string'||typeof run.name!=='string'||typeof run.result!=='string'||!Number.isFinite(run.at))throw Error('実行履歴が不正です。');
    for(const e of data.events)if(e.repeatUntil&&(!/^\d{4}-\d{2}-\d{2}$/.test(e.repeatUntil)||!Number.isFinite(Date.parse(e.repeatUntil))))throw Error('繰り返し終了日が不正です。');
    return data;
}
export function folderTargetValid(folders,id,parentId,projectId,includeDeleted=false) {
    const seen=new Set([id]); let current=parentId;
    while(current){if(seen.has(current))return false;seen.add(current);const folder=folders.find(f=>f.id===current&&(includeDeleted||!f.deletedAt)&&f.projectId===projectId);if(!folder)return false;current=folder.parentId;}
    return true;
}
export function eventOccurrences(event, from, until) {
    const start=new Date(event.start),end=new Date(event.end||event.start);
    if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<start)return [];
    const duration=+end-+start,result=[];let cursor=new Date(start);
    // Bound work even for malformed imported recurrence.
    for(let i=0;i<40000&&cursor<=until;i++){
        if(event.repeatUntil&&cursor>new Date(event.repeatUntil+'T23:59:59'))break;
        if(+cursor+duration>=+from)result.push({...event,start:cursor.toISOString(),end:new Date(+cursor+duration).toISOString()});
        if(!['daily','weekly','monthly'].includes(event.repeat))break;
        if(event.repeat==='monthly'){const month=cursor.getMonth()+1;cursor=new Date(cursor.getFullYear(),month,1,start.getHours(),start.getMinutes());cursor.setDate(Math.min(start.getDate(),new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate()));}
        else cursor.setDate(cursor.getDate()+(event.repeat==='weekly'?7:1));
    }
    return result;
}
export function validateFlow(blocks) {
    if(!Array.isArray(blocks)||!blocks.length||blocks.length>20)throw Error('操作は1〜20件です。');
    for(const b of blocks)if(!['task','memo'].includes(b.type)||typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)throw Error('タスク追加・メモ追記のみ対応しています（各2000文字まで）。');
    return blocks;
}
let connection;
export function canvasDB(){
    if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open('lifetop-connected-canvas',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('backups');};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>{connection=null;reject(r.error);};r.onblocked=()=>{connection=null;reject(Error('ほかのタブを閉じて保存を再試行してください。'));};});
    return connection;
}
export async function readCanvas(){const db=await canvasDB();return new Promise((resolve,reject)=>{const tx=db.transaction('state');const r=tx.objectStore('state').get('canvas');tx.oncomplete=()=>{try{resolve(r.result?validateCanvas(r.result):emptyCanvas());}catch(e){reject(e);}};tx.onerror=()=>reject(tx.error);});}
export async function commitCanvas(next, expected){validateCanvas(next);const db=await canvasDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['state','backups'],'readwrite'),store=tx.objectStore('state');let conflict=false;const r=store.get('canvas');r.onsuccess=()=>{const old=r.result;if((old?.revision||0)!==expected){conflict=true;tx.abort();return;}if(old)tx.objectStore('backups').put(old,'previous');store.put({...next,revision:expected+1},'canvas');};tx.oncomplete=()=>resolve({...next,revision:expected+1});tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(conflict?Error('別のタブで更新されました。再読込してから操作してください。変更は上書きしていません。'):tx.error||Error('保存できませんでした。'));});}
export async function backupLegacy(raw){const db=await canvasDB();return new Promise((resolve,reject)=>{const tx=db.transaction('backups','readwrite'),s=tx.objectStore('backups'),r=s.get('legacy-v9');r.onsuccess=()=>{if(r.result===undefined)s.put({raw,createdAt:Date.now()},'legacy-v9');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function previousCanvas(){const db=await canvasDB();return new Promise((resolve,reject)=>{const tx=db.transaction('backups'),r=tx.objectStore('backups').get('previous');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}
export async function legacyBackup(){const db=await canvasDB();return new Promise((resolve,reject)=>{const tx=db.transaction('backups'),r=tx.objectStore('backups').get('legacy-v9');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function saveStudioFile(project,id=null,expectedUpdatedAt=undefined){const state=await readCanvas();const old=state.files.find(f=>f.id===id);if(id&&(!old||old.deletedAt||state.projects.find(p=>p.id===old.projectId)?.deletedAt))throw Error('ファイルが削除されています。新規ファイルとして保存してください。');if(old&&expectedUpdatedAt!==undefined&&old.updatedAt!==expectedUpdatedAt)throw Error('別のタブでファイルが変更されました。新規ファイルとして保存するか、バックアップをダウンロードしてください。');const file={...old,...project,id:old?.id||crypto.randomUUID(),kind:'studio',projectId:old?.projectId||'',folderId:old?.folderId||'',updatedAt:Math.max(Date.now(),(old?.updatedAt||0)+1),createdAt:old?.createdAt||Date.now()};if(old)Object.assign(old,file);else state.files.push(file);await commitCanvas(state,state.revision);return {id:file.id,updatedAt:file.updatedAt};}
