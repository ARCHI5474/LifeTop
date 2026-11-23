import {initUISystem} from './ui-system.js?v=13.0.1';
import {googleSession} from './google-session.js?v=13.0.1';
import {createChatService} from './chat-service.js?v=13.0.1';
import {initResponsiveUI} from './responsive-ui.js?v=13.0.1';
const $=id=>document.getElementById(id), show=(id,on)=>$(id).hidden=!on;
let pendingInvite=new URLSearchParams(location.hash.slice(1)).get('invite'),session,client,roomId='',unwatch,unwatchRoom,authEpoch=0,roomEpoch=0,queue=Promise.resolve(),next=0;
const drafts=new Map(),pendingSends=new Map();
if(pendingInvite)history.replaceState(null,'',location.pathname+location.search);
function status(text=''){if($('messages-status').textContent!==text)$('messages-status').textContent=text;}
function errorText(error){return error.code==='permission-denied'?'アクセスできません。ログインと接続設定を確認してください。':error.code==='auth/popup-closed-by-user'?'ログインを中止しました。':error.code==='auth/popup-blocked'?'ポップアップを許可して再試行してください。':error.message||'接続できません。再試行してください。';}
function command(op,data={}){
 const uid=session?.auth.currentUser?.uid,epoch=authEpoch;
 const request=queue.then(async()=>{
  if(epoch!==authEpoch||uid!==session?.auth.currentUser?.uid)throw Error('アカウントが変更されました。');
  const delay=next-Date.now();if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
  if(epoch!==authEpoch)throw Error('アカウントが変更されました。');
  next=Date.now()+1100;return client.command(op,data);
 });queue=request.catch(()=>{});return request;
}
function selectSharedRoom(id){try{localStorage.setItem('lifetop_live_room_v13',id);const channel=new BroadcastChannel('lifetop-room');channel.postMessage({roomId:id});channel.close();}catch{}if(parent!==window)parent.postMessage({type:'lifetop:messages-room',roomId:id},location.origin);}
function closeRoom(){
 roomEpoch++;
 if(roomId)drafts.set(roomId,$('messages-body').value);
 unwatch?.();
 unwatchRoom?.();
 unwatch=unwatchRoom=null;
 roomId='';
 show('messages-room',false);
 document.querySelector('#messages-room details').open=false;
 show('messages-rotate',false);
 show('messages-delete-room',false);
 document.querySelector('#messages-rooms [aria-current="true"]')?.setAttribute('aria-current','false');
 for(const id of ['messages-room-title','messages-members','messages-history','messages-invite'])$(id).replaceChildren();
 $('messages-body').value='';
}
async function rooms(){const epoch=authEpoch,{rooms}=await command('list');if(epoch!==authEpoch)return;$('messages-rooms').replaceChildren();for(const room of rooms){const b=document.createElement('button');b.type='button';b.className='text-btn';b.textContent=room.name;b.dataset.roomId=room.id;b.setAttribute('aria-current',String(roomId===room.id));b.onclick=()=>openRoom(room.id);$('messages-rooms').append(b);}if(!rooms.length)$('messages-rooms').textContent='ルームはありません。';status();return rooms;}
function invitation(token){const link=new URL('messages.html',location.href);link.hash='invite='+token;const a=document.createElement('a');a.href=link.href;a.textContent=link.href;$('messages-invite').replaceChildren(a);}
function openRoom(id){
 if(roomId===id)return;
 closeRoom();roomId=id;const epoch=roomEpoch;show('messages-room',true);$('messages-body').value=drafts.get(id)||'';selectSharedRoom(id);
 document.querySelectorAll('#messages-rooms button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.roomId===id)));
 const {fs,db,auth}=session;
 unwatchRoom=fs.onSnapshot(client.roomRef(id),snapshot=>{
  if(epoch!==roomEpoch)return;if(!snapshot.exists()||snapshot.data().deleted){closeRoom();status('ルームが削除されました。');return;}
  const room=snapshot.data();$('messages-room-title').textContent=room.name;$('messages-members').textContent=room.members.length+'人';show('messages-rotate',room.owner===auth.currentUser?.uid);show('messages-delete-room',room.owner===auth.currentUser?.uid);
 },error=>{if(epoch===roomEpoch){closeRoom();status(errorText(error));}});
 const seen=new Set();let initialized=false;
 unwatch=fs.onSnapshot(client.historyQuery(id),snapshot=>{
  if(epoch!==roomEpoch)return;const list=$('messages-history'),scroll=list.scrollHeight-list.clientHeight-list.scrollTop<60;list.replaceChildren();
  for(const doc of [...snapshot.docs].reverse()){
   const m=doc.data();if(!m.createdAt||m.createdAt.toMillis()<=client.now()-90*86400000)continue;
   const li=document.createElement('li'),small=document.createElement('small'),p=document.createElement('p');small.textContent=m.nickname+' · '+m.createdAt.toDate().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});p.textContent=m.body;li.append(small,p);
   if(m.sender===auth.currentUser?.uid){li.className='messages-own';const b=document.createElement('button');b.className='text-btn';b.textContent='削除';b.onclick=async()=>{if(!confirm('このメッセージを削除しますか？'))return;b.disabled=true;try{await command('deleteMessage',{roomId:id,messageId:doc.id});}catch(e){status(errorText(e));b.disabled=false;}};li.append(b);}
   list.append(li);if(initialized&&!seen.has(doc.id)&&m.sender!==auth.currentUser?.uid&&document.hidden)document.title='新着 · Messages | LifeTop';seen.add(doc.id);
  }
  if(scroll||!initialized)list.scrollTop=list.scrollHeight;initialized=true;
 },error=>{if(epoch===roomEpoch)status(errorText(error));});
}
function bind(id,fn){$(id).onclick=async()=>{const b=$(id);b.disabled=true;try{await fn();}catch(error){status(errorText(error));}finally{b.disabled=false;}};}
async function initialize(){
 show('messages-retry',false);
 try{
  session=await googleSession();client=createChatService(session.db,session.auth,session.fs);
  session.watch(async user=>{
   const epoch=++authEpoch;closeRoom();drafts.clear();pendingSends.clear();$('messages-rooms').replaceChildren();status();
   const signed=!!user&&!user.isAnonymous&&user.providerData.some(item=>item.providerId==='google.com');
   show('messages-login',!signed);show('messages-controls',signed);show('messages-logout',signed);$('messages-account').textContent=signed?user.displayName||'Googleアカウント':'';
   if(!signed){$('messages-connect').disabled=false;return;}
   try{await client.calibrate();if(epoch!==authEpoch)return;show('messages-join',!!pendingInvite);const list=await rooms();if(!pendingInvite&&list?.length)openRoom(list[0].id);}catch(error){if(epoch===authEpoch)status(errorText(error));}
  });
  $('messages-connect').disabled=false;
 }catch(error){status(errorText(error));show('messages-retry',true);}
}
bind('messages-connect',async()=>{if(!session)await initialize();if(session)await session.login();});
bind('messages-retry',initialize);bind('messages-refresh',rooms);bind('messages-logout',async()=>{closeRoom();await session.logout();});
$('messages-create-form').onsubmit=async e=>{e.preventDefault();const b=$('messages-create');b.disabled=true;try{const result=await command('create',{name:$('messages-name').value});await rooms();openRoom(result.roomId);invitation(result.token);$('messages-name').value='';}catch(error){status(errorText(error));}finally{b.disabled=false;}};
bind('messages-join',async()=>{const result=await command('join',{token:pendingInvite});pendingInvite=null;show('messages-join',false);await rooms();openRoom(result.roomId);});
bind('messages-rotate',async()=>{if(!confirm('以前の招待リンクを無効にして、新しく発行しますか？'))return;const id=roomId,result=await command('rotate',{roomId:id});if(roomId===id)invitation(result.token);});
bind('messages-leave',async()=>{if(!confirm('ルームから退出しますか？'))return;const id=roomId;await command('leave',{roomId:id});if(roomId===id)closeRoom();selectSharedRoom('');await rooms();});
bind('messages-delete-room',async()=>{if(!confirm('ルームを削除しますか？'))return;const id=roomId;await command('deleteRoom',{roomId:id});if(roomId===id)closeRoom();selectSharedRoom('');await rooms();});
$('messages-send').onsubmit=async e=>{
 e.preventDefault();const b=e.target.querySelector('button');if(b.disabled||!roomId)return;b.disabled=true;const epoch=authEpoch;
 try{
  const body=$('messages-body').value;let attempt=pendingSends.get(roomId);if(!attempt||attempt.body!==body){attempt={roomId,body,requestId:crypto.randomUUID()};pendingSends.set(roomId,attempt);}await command('send',attempt);
  if(epoch!==authEpoch)return;if(roomId===attempt.roomId&&$('messages-body').value===attempt.body)$('messages-body').value='';else if(drafts.get(attempt.roomId)===attempt.body)drafts.delete(attempt.roomId);if(pendingSends.get(attempt.roomId)===attempt)pendingSends.delete(attempt.roomId);status();
 }catch(error){if(epoch===authEpoch)status(errorText(error));}finally{b.disabled=false;}
};
window.addEventListener('offline',()=>status('オフラインです。接続後に再試行してください。'));window.addEventListener('online',()=>status());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)document.title='Messages | LifeTop';});
window.addEventListener('pagehide',event=>{if(!event.persisted){unwatch?.();unwatchRoom?.();}});
if(new URLSearchParams(location.search).has('embedded'))document.body.classList.add('mini-embedded');
initUISystem();initResponsiveUI();void initialize();
