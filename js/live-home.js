import {createLiveScene} from './live-scene.js?v=13.0.1';
import {createLiveWeather} from './live-weather.js?v=13.0.1';
import {createLiveAudio} from './live-audio.js?v=13.0.1';
import {googleSession} from './google-session.js?v=13.0.1';
import {createChatService} from './chat-service.js?v=13.0.1';
import {activePresence,newRipples} from './live-model.js?v=13.0.1';
export function initLiveHome(){
 const $=id=>document.getElementById(id),toggle=$('live-home-enabled'),background=$('bg-overlay');if(!toggle||!background)return;
 let scene,weather,canvas,settings={};try{const s=JSON.parse(localStorage.getItem('lifetop_live_v1')||'{}');if(s&&typeof s==='object')settings=s;toggle.checked=localStorage.getItem('lifetop_live_home_v1')!=='false';}catch{toggle.checked=true;}
 const audio=createLiveAudio(bands=>scene?.setBands(bands),(text,running)=>{$('live-home-audio-status').textContent=text;$('live-home-audio-stop').disabled=!running;});
 let session,client,roomId='',members=[],rows=[],unwatch,unwatchRoom,authWatch,timer,expiry,epoch=0,ack=0,ready=false,lastWrite=0,busy=false;
 let sharedGeneration=0;
 const seen=new Set();let sessionId='';
 function people(){
  const connected=roomId&&ready&&ack>Date.now()-45000&&!document.hidden&&navigator.onLine;
  const present=connected?activePresence(rows,members,client.now()):[];scene?.setPeople(present);
  $('live-home-people').textContent=roomId?(connected?present.length+'人が接続中':'再接続中'):'';
  if(connected)for(const wave of newRipples(present,seen,client.now()))scene?.ripple(wave.x,wave.y);
 }
 function detach(){const old=roomId,oldSession=sessionId;epoch++;roomId='';rows=[];members=[];ack=0;ready=false;busy=false;seen.clear();unwatch?.();unwatchRoom?.();clearInterval(timer);clearInterval(expiry);scene?.setPeople([]);$('live-home-people').textContent='';if(old&&client)void client.presence(old,oldSession,true).catch(()=>{});}
 async function pulse(){if(!roomId||document.hidden||!navigator.onLine||busy||Date.now()-lastWrite<1200)return;busy=true;const e=epoch,id=roomId;lastWrite=Date.now();try{await client.presence(id,sessionId);if(e===epoch)ack=Date.now();}catch{if(e===epoch)ack=0;}finally{if(e===epoch){busy=false;people();}}}
 async function wave(x=.5,y=.5){if(!scene)return;if(!roomId||!ready||!ack){scene.ripple(x,y);return;}if(busy)return;busy=true;const e=epoch;try{const delay=1200-(Date.now()-lastWrite);if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));if(e!==epoch)return;lastWrite=Date.now();await client.presence(roomId,sessionId,false,{x,y});}catch{if(e===epoch)$('live-home-people').textContent='波紋を送れませんでした。';}finally{if(e===epoch)busy=false;}}
 async function attach(id){
  detach();if(!id||!scene||!session?.auth.currentUser||session.auth.currentUser.isAnonymous)return;const e=epoch;roomId=id;sessionId=crypto.randomUUID();
  try{await client.calibrate();if(e!==epoch)return;const{fs,db}=session;
   unwatchRoom=fs.onSnapshot(client.roomRef(id),s=>{if(e!==epoch)return;if(!s.exists()||s.data().deleted){detach();return;}members=s.data().members;people();},()=>{if(e===epoch)detach();});
   unwatch=fs.onSnapshot(fs.query(fs.collection(db,'chatRooms',id,'presence'),fs.orderBy('updatedAt','desc'),fs.limit(20)),{includeMetadataChanges:true},s=>{if(e!==epoch)return;ready=!s.metadata.fromCache;rows=s.docs.map(doc=>{const d=doc.data(),stamps=Object.values(d.sessions||{}).map(v=>v?.toMillis?.()||0);return {...d,id:doc.id,updatedAtMs:d.updatedAt?.toMillis?.()||0,expiresAtMs:Math.max(0,...stamps)+80000,ripple:d.ripple?{...d.ripple,at:d.ripple.at?.toMillis?.()||0}:null};});people();},()=>{if(e===epoch){ready=false;people();}});
   void pulse();timer=setInterval(pulse,30000);expiry=setInterval(people,1000);
  }catch{if(e===epoch)detach();}
 }
 function stopSharing(){
  sharedGeneration++;
  authWatch?.();
  authWatch=null;
  detach();
 }
 async function shared(id){
  if(id&&!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return;
  stopSharing();
  if(!id||!scene)return;
  const generation=sharedGeneration;
  try{
   const nextSession=await googleSession();
   if(generation!==sharedGeneration)return;
   session=nextSession;
   client=createChatService(session.db,session.auth,session.fs);
   authWatch=session.watch(user=>{
    if(generation!==sharedGeneration)return;
    if(user&&!user.isAnonymous&&user.providerData.some(p=>p.providerId==='google.com'))void attach(id);
    else detach();
   });
  }catch{if(generation===sharedGeneration)$('live-home-people').textContent='接続できません。';}
 }
 function save(){try{localStorage.setItem('lifetop_live_v1',JSON.stringify(settings));}catch{$('live-home-status').textContent='設定を保存できませんでした。';}}
 function apply(){
  stopSharing();audio.stop('');scene?.destroy();weather?.destroy();canvas?.remove();scene=weather=canvas=null;document.body.classList.toggle('live-home-enabled',toggle.checked);document.dispatchEvent(new Event('lifetop:live-change'));
  if(!toggle.checked)return;
  canvas=document.createElement('canvas');canvas.id='live-home-canvas';canvas.setAttribute('aria-hidden','true');background.append(canvas);
  scene=createLiveScene(canvas,{home:true,reduced:()=>document.documentElement.classList.contains('reduce-motion')});scene.setScene(settings.scene||'aurora');
  weather=createLiveWeather(value=>scene?.setWeather(value),text=>$('live-home-status').textContent=text);$('live-home-location').value=weather.getLocation();void weather.refresh();
  let id='';try{id=localStorage.getItem('lifetop_live_room_v13')||'';}catch{}if(id)void shared(id);
 }
 toggle.onchange=()=>{try{localStorage.setItem('lifetop_live_home_v1',String(toggle.checked));apply();}catch{toggle.checked=!toggle.checked;$('live-home-status').textContent='設定を保存できませんでした。';}};
 $('live-home-scene').value=settings.scene||'aurora';$('live-home-scene').onchange=e=>{settings.scene=e.target.value;scene?.setScene(settings.scene);save();};
 $('live-home-location').onchange=e=>void weather?.select(e.target.value);
 $('live-home-mic').onclick=()=>{if(!toggle.checked)toggle.click();if(toggle.checked)void audio.start('mic');};
 $('live-home-audio-file').onchange=e=>{if(e.target.files[0]){if(!toggle.checked)toggle.click();if(toggle.checked)void audio.start('file',e.target.files[0]);}e.target.value='';};
 $('live-home-audio-stop').onclick=()=>audio.stop('');
 document.addEventListener('click',e=>{if(e.target.closest('button,a,input,textarea,select,dialog,.settings-panel,.glass-card'))return;if(e.target===document.body||e.target.closest('.hero-section'))void wave(Math.min(1,e.clientX/innerWidth),Math.min(1,e.clientY/innerHeight));});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.stop('');ack=0;if(roomId)void client.presence(roomId,sessionId,true).catch(()=>{});people();}else void pulse();});
 window.addEventListener('offline',()=>{ack=0;people();});window.addEventListener('online',()=>void pulse());
 let channel;try{channel=new BroadcastChannel('lifetop-room');channel.onmessage=e=>{if(toggle.checked)void shared(e.data.roomId);};}catch{}
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.querySelector('#messages-dialog iframe')?.contentWindow&&e.data?.type==='lifetop:messages-room'&&toggle.checked)void shared(e.data.roomId);});
 window.addEventListener('pagehide',event=>{
  audio.stop('');
  if(event.persisted)return;
  stopSharing();scene?.destroy();weather?.destroy();channel?.close();
 });
 apply();
}
