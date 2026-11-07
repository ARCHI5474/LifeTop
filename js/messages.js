import {initHiddenTens} from './festival-hunt.js?v=10.1-hide1';
import {festivalConfig} from './festival-config.js';
import {initUISystem} from './ui-system.js?v=10.0-ui5';
import {messagesConfig as config} from './messages-config.js';
import {cloudSyncConfig} from './firebase-config.js?v=9.0';
const $=id=>document.getElementById(id),SDK='https://www.gstatic.com/firebasejs/13.1.0';
let pendingInvite=new URLSearchParams(location.hash.slice(1)).get('invite'),auth,db,fs,call,roomId='',unwatch,unwatchRoom,notified=new Set(),initialized=false,appChecked=false,pendingSend=null;
if(pendingInvite)history.replaceState(null,'',location.pathname);
const show=(id,on)=>$(id).hidden=!on;
function status(message){$('messages-status').textContent=message;}
function nickname(){const n=$('messages-nickname').value.trim();if(!n||n.length>40)throw Error('ニックネームを1〜40文字で入力してください。');return n;}
async function command(op,extra={}){return (await call({op,...extra})).data;}
function invitation(token){const link=new URL('messages.html',location.href);link.hash='invite='+token;$('messages-invite').textContent='招待リンク（このリンクを知る人が参加できます）: '+link.href;}
async function rooms(){const result=await command('list');$('messages-rooms').replaceChildren();for(const room of result.rooms){const b=document.createElement('button');b.className='tonal-btn';b.textContent=room.name+' ('+room.members+'/20)';b.onclick=()=>openRoom(room.id);$('messages-rooms').append(b);}}
function closeRoom(){unwatch?.();unwatchRoom?.();roomId='';show('messages-room',false);$('messages-history').replaceChildren();$('messages-invite').textContent='';}
function openRoom(id){closeRoom();roomId=id;show('messages-room',true);initialized=false;notified=new Set();
 unwatchRoom=fs.onSnapshot(fs.doc(db,'messageRooms',id),snapshot=>{if(roomId!==id)return;if(!snapshot.exists()||snapshot.data().deleted){closeRoom();status('ルームは削除されました。');return;}const room=snapshot.data();$('messages-room-title').textContent=room.name;$('messages-members').textContent=room.members.length+'/20人';show('messages-rotate',room.owner===auth.currentUser.uid);show('messages-delete-room',room.owner===auth.currentUser.uid);},error=>{closeRoom();status('ルームへアクセスできません。'+error.message);});
 const query=fs.query(fs.collection(db,'messageRooms',id,'messages'),fs.where('expiresAt','>',fs.Timestamp.fromMillis(Date.now()+60000)),fs.orderBy('expiresAt','desc'),fs.limit(100));
 unwatch=fs.onSnapshot(query,snapshot=>{if(roomId!==id)return;const list=$('messages-history');list.replaceChildren();for(const item of [...snapshot.docs].reverse()){const m=item.data();if(m.expiresAt.toMillis()<=Date.now())continue;const li=document.createElement('li'),p=document.createElement('p'),small=document.createElement('small');p.textContent=m.body;p.style.whiteSpace='pre-wrap';p.style.overflowWrap='anywhere';small.textContent=m.nickname+' · '+m.createdAt.toDate().toLocaleString();li.append(small,p);if(m.sender===auth.currentUser.uid){const b=document.createElement('button');b.textContent='削除';b.className='text-btn';b.onclick=async()=>{if(!confirm('自分のメッセージを削除しますか？'))return;try{await command('deleteMessage',{roomId:id,messageId:item.id});}catch(e){status(e.message);}};li.append(b);}list.append(li);if(initialized&&!notified.has(item.id)&&m.sender!==auth.currentUser.uid){status(m.nickname+': '+m.body);if('Notification'in window&&Notification.permission==='granted'&&document.hidden)new Notification('LifeTop Messages',{body:m.nickname+': '+m.body});}notified.add(item.id);}initialized=true;},e=>status('履歴を取得できません。'+e.message));
}
async function connect(){nickname();const [appSDK,authSDK,firestore,functions,check]=await Promise.all(['app','auth','firestore','functions','app-check'].map(name=>import(`${SDK}/firebase-${name}.js`)));const app=appSDK.getApps().find(a=>a.name==='lifetop-messages')||appSDK.initializeApp(cloudSyncConfig.firebase,'lifetop-messages');if(!appChecked){check.initializeAppCheck(app,{provider:new check.ReCaptchaV3Provider(config.appCheckSiteKey),isTokenAutoRefreshEnabled:true});appChecked=true;}auth=authSDK.getAuth(app);await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);await auth.authStateReady();if(!auth.currentUser)await authSDK.signInAnonymously(auth);if(!auth.currentUser.isAnonymous)throw Error('Messages専用の匿名IDが必要です。');db=firestore.getFirestore(app);fs=firestore;call=functions.httpsCallable(functions.getFunctions(app,config.region),'messagesCommand');show('messages-signed-in',true);$('messages-connect').disabled=true;show('messages-join',Boolean(pendingInvite));await rooms();status('匿名IDで接続しました。');}
function bind(id,fn){$(id).onclick=async()=>{const b=$(id);b.disabled=true;try{await fn();}catch(e){status(e.message||'操作できませんでした。');}finally{if(id!=='messages-connect'||!auth?.currentUser)b.disabled=false;}};}
if(!config.enabled||!config.appCheckSiteKey){show('messages-setup',true);status('Messagesはサーバー設定待ちです。');}else{show('messages-controls',true);
 bind('messages-connect',connect);bind('messages-refresh',rooms);
 bind('messages-create',async()=>{const result=await command('create',{name:$('messages-name').value,nickname:nickname()});openRoom(result.roomId);invitation(result.token);status('ルームを作成しました。参加一覧は「更新」で取得できます。');});
 bind('messages-join',async()=>{const result=await command('join',{token:pendingInvite,nickname:nickname()});pendingInvite=null;show('messages-join',false);openRoom(result.roomId);status('参加しました。');});
 bind('messages-rotate',async()=>{if(!confirm('以前の招待リンクを無効にして再発行しますか？'))return;const result=await command('rotate',{roomId});invitation(result.token);});
 bind('messages-leave',async()=>{if(!confirm('このルームから退出しますか？管理者が退出すると次の参加者へ管理権限を引き継ぎます。'))return;await command('leave',{roomId});closeRoom();status('退出しました。');});
 bind('messages-delete-room',async()=>{if(!confirm('ルームを削除しますか？全員が閲覧できなくなり履歴は削除対象になります。'))return;await command('deleteRoom',{roomId});closeRoom();status('ルームを削除しました。');});
 bind('messages-notifications',async()=>{if(!('Notification'in window))throw Error('通知非対応のブラウザです。');status('通知: '+await Notification.requestPermission());});
 $('messages-send').onsubmit=async e=>{
  e.preventDefault();const b=e.target.querySelector('button');if(b.disabled)return;b.disabled=true;
  try{
   const field=$('messages-body'),body=field.value,name=nickname();
   if(!pendingSend||pendingSend.roomId!==roomId||pendingSend.body!==body||pendingSend.nickname!==name)pendingSend={roomId,body,nickname:name,requestId:crypto.randomUUID()};
   const attempt=pendingSend;await command('send',attempt);
   if(roomId===attempt.roomId&&field.value===attempt.body)field.value='';
   if(pendingSend===attempt)pendingSend=null;
  }catch(error){status(error.message);}finally{b.disabled=false;}
 };
}
window.addEventListener('pagehide',()=>{unwatch?.();unwatchRoom?.();});

initUISystem();

initHiddenTens(festivalConfig);
