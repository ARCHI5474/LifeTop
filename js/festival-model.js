export const FESTIVAL_DB='lifetop-festival-v10';
export const DAY_MS=86400000;
export const collectionNames=Object.freeze(['LifeTop Beginner','LifeTop Explorer','LifeTop Creator','LifeTop Challenger','LifeTop Dreamer','LifeTop Innovator','LifeTop Partner','LifeTop Pioneer','LifeTop Master','LifeTop Legend']);
export const eggNames=Object.freeze({home:'Hidden Ten',version:'Version X',studio:'Creator 10'});
export function eventWindow(config,now=Date.now()){
 if(config.releaseAt===null||config.releaseAt==='')return {phase:'unconfigured',start:null,end:null};
 if(typeof config.releaseAt!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(config.releaseAt)||!Number.isFinite(Date.parse(config.releaseAt))||config.durationDays!==10)throw Error('Festivalの公開日時設定を確認してください。');
 const start=Date.parse(config.releaseAt),end=start+10*DAY_MS;return {phase:now<start?'before':now<end?'active':'ended',start,end};
}
export function japanDate(now){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
export function emptyFestival(){return {schema:1,ticket:null,draws:[],eggs:{},best:null,welcomeSeen:false};}
export function validateFestival(s){
 if(!s||s.schema!==1||!Array.isArray(s.draws)||!s.eggs||typeof s.eggs!=='object'||typeof s.welcomeSeen!=='boolean')throw Error('記念品の保存データを読み込めません。既存データは変更していません。');
 if(s.draws.some(d=>!d||!Number.isInteger(d.item)||d.item<0||d.item>=10||!Number.isFinite(d.at)||d.day!==japanDate(d.at)))throw Error('ガチャ履歴の形式が不正です。');
 if(new Set(s.draws.map(d=>d.day)).size!==s.draws.length)throw Error('ガチャ履歴の日付が重複しています。');
 if(s.ticket&&(!/^[A-Z2-9]{8}$/.test(s.ticket.number)||!Number.isFinite(s.ticket.issuedAt)||typeof s.ticket.nickname!=='string'||s.ticket.nickname.length>40))throw Error('チケットの形式が不正です。');
 for(const [id,at] of Object.entries(s.eggs))if(!Object.hasOwn(eggNames,id)||!Number.isFinite(at))throw Error('バッジの形式が不正です。');
 if(s.best!==null&&(!s.best||!Number.isFinite(s.best.elapsedMs)||s.best.elapsedMs<0||!Number.isFinite(s.best.at)))throw Error('記録の形式が不正です。');
 return s;
}
export function randomInt(max,fill=bytes=>crypto.getRandomValues(bytes)){
 if(!Number.isInteger(max)||max<1||max>256)throw Error('抽選範囲が不正です。');const bytes=new Uint8Array(1),limit=256-(256%max);do{fill(bytes);}while(bytes[0]>=limit);return bytes[0]%max;
}
export function issueTicket(s,now,random=randomInt){if(!s.ticket){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';s.ticket={number:Array.from({length:8},()=>alphabet[random(alphabet.length)]).join(''),issuedAt:now,nickname:''};}return s.ticket;}
function requireActive(config,now){if(eventWindow(config,now).phase!=='active')throw Error('イベント開催期間外です。記念品はMemoriesから閲覧できます。');}
export function participate(s,config,now=Date.now(),random=randomInt){requireActive(config,now);issueTicket(s,now,random);return s;}
export function drawCollection(s,config,now=Date.now(),random=randomInt){requireActive(config,now);const day=japanDate(now);if(s.draws.some(d=>d.day===day))throw Error('今日のガチャは獲得済みです。日本時間の0時に次の1回を引けます。');issueTicket(s,now,random);const draw={day,at:now,item:random(10)};s.draws.push(draw);return draw;}
export function challengeResult(elapsedMs){if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('計測結果が不正です。');const hundredths=Math.round(elapsedMs/10),errorHundredths=Math.abs(hundredths-1000),errorMs=Math.abs(elapsedMs-10000);return {elapsed:(hundredths/100).toFixed(2),difference:(errorHundredths/100).toFixed(2),errorMs,label:errorHundredths===0?'Perfect 10!':errorHundredths<=3?'Amazing!':errorHundredths<=10?'Excellent!':errorHundredths<=50?'Great!':'もう一度チャレンジ！'};}
export function saveChallenge(s,config,elapsedMs,now=Date.now(),random=randomInt){requireActive(config,now);challengeResult(elapsedMs);issueTicket(s,now,random);if(!s.best||Math.abs(elapsedMs-10000)<Math.abs(s.best.elapsedMs-10000))s.best={elapsedMs,at:now};return s.best;}
export function discoverEgg(s,config,id,now=Date.now(),random=randomInt){requireActive(config,now);if(!Object.hasOwn(eggNames,id))throw Error('未対応のバッジです。');issueTicket(s,now,random);if(!Object.hasOwn(s.eggs,id))s.eggs[id]=now;return s;}
let connection;
function database(){if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open(FESTIVAL_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>{connection=null;reject(r.error);};r.onblocked=()=>{connection=null;reject(Error('ほかのLifeTopタブを閉じて再試行してください。'));};});return connection;}
export async function readFestival(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('data'),r=tx.objectStore('data').get('state');tx.oncomplete=()=>{try{resolve(r.result===undefined?emptyFestival():validateFestival(r.result));}catch(e){reject(e);}};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
// Read, daily-limit check and write share one transaction across tabs.
export async function updateFestival(change){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite'),store=tx.objectStore('data'),r=store.get('state');let next,cause;r.onsuccess=()=>{try{next=structuredClone(r.result===undefined?emptyFestival():validateFestival(r.result));change(next);validateFestival(next);store.put(next,'state');}catch(e){cause=e;tx.abort();}};tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(cause||tx.error||Error('記念品を保存できませんでした。'));});}
