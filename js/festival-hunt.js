import {eventWindow,readFestival,updateFestival} from './festival-model.js';
import {findHiddenTen} from './festival-hunt-model.js';
import {huntSpots} from './festival-hunt-spots.js';

let initialized=false;
export function initHiddenTens(config) {
 if(initialized)return;initialized=true;
 let state,toast,loading=false;const buttons=new Map();
 const active=()=>eventWindow(config).phase==='active';
 function notify(text){
  toast?.remove();const current=document.createElement('p');toast=current;current.className='festival-found-toast';current.setAttribute('role','status');current.textContent=text;document.body.append(current);setTimeout(()=>current.remove(),5000);
 }
 function scan(){
  for(const spot of huntSpots){
   const found=Boolean(state?.hideAndSeek?.found[spot.id]);let button=buttons.get(spot.id);
   if(!active()||found){button?.remove();buttons.delete(spot.id);continue;}
   if(button?.isConnected)continue;
   const host=document.querySelector(spot.selector);if(!host)continue;
   button=document.createElement('button');button.type='button';button.className='festival-hidden-ten';button.textContent='10';button.dataset.hiddenTen=spot.id;button.setAttribute('aria-label','隠れた10を見つける');button.title='ここにも10が…！';
   button.onclick=async event=>{
    event.preventDefault();event.stopPropagation();button.disabled=true;
    try{
     state=await updateFestival(s=>findHiddenTen(s,config,spot.id));const count=Object.keys(state.hideAndSeek.found).length;
     notify(count===10?'🎉 10 / 10！ 全部発見！ Hidden Tenバッジを獲得しました。':`✦ 隠れた10を発見！ ${count} / 10`);
     scan();document.dispatchEvent(new Event('festival:found-ten'));
    }catch(error){button.disabled=false;notify(error.message);}
   };
   host.append(button);buttons.set(spot.id,button);
  }
 }
 async function refresh(){if(loading)return;loading=true;try{state=await readFestival();scan();}catch{/* Existing data stays intact when storage is unavailable. */}finally{loading=false;}}
 void refresh();
 const interval=setInterval(()=>{if(!active()){buttons.forEach(b=>b.remove());buttons.clear();}else void refresh();},1000);
 window.addEventListener('focus',()=>void refresh());
 window.addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(interval);toast?.remove();});window.addEventListener('pageshow',()=>void refresh());
}

export function initFestivalHunt({config,onSaved}) {
 const root=document.getElementById('festival-hunt');if(!root)return;
 async function render(){
  try{
   const state=await readFestival(),found=state.hideAndSeek?.found??{},count=Object.keys(found).length;
   root.querySelector('[data-hunt-progress]').textContent=`${count} / 10 発見`;root.querySelector('progress').value=count;
   const list=root.querySelector('[data-hunt-hints]');list.replaceChildren();
   for(const spot of huntSpots){const li=document.createElement('li');li.textContent=(found[spot.id]?'✓ 発見済み · ':'？ ')+spot.hint;list.append(li);}
   root.querySelector('[role=status]').textContent=count===10?'COMPLETE! 10個すべて発見。Hidden Tenバッジを獲得しました！':eventWindow(config).phase==='active'?'サイトを歩いて、小さな点線の10をタップ。時間制限なしで探せます。':eventWindow(config).phase==='ended'?'探索は終了しました。発見の記録はここに残ります。':'開催までお楽しみに。イベントが始まると隠れた10を探せます。';onSaved(state);
  }catch(error){root.querySelector('[role=status]').textContent=error.message;}
 }
 document.addEventListener('festival:found-ten',()=>void render());window.addEventListener('focus',()=>void render());
 const interval=setInterval(()=>void render(),2000);window.addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(interval);});window.addEventListener('pageshow',()=>void render());
 void render();initHiddenTens(config);
}
