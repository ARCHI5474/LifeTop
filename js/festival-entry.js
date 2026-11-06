import {festivalConfig} from './festival-config.js';
import {eventWindow,eggNames,updateFestival,discoverEgg} from './festival-model.js';
function pop(message,welcome=false){
 document.getElementById('festival-pop')?.remove();const root=document.createElement('aside');root.id='festival-pop';root.className='festival-pop';root.setAttribute('aria-label',welcome?'v10公開記念':'記念バッジ');
 const text=document.createElement('p');text.textContent=message;text.setAttribute('role','status');root.append(text);const actions=document.createElement('div');actions.className='mini-tools';const link=document.createElement('a');link.className='tonal-btn';link.href='festival.html';link.textContent=welcome?'Festivalを見る':'記念品を見る';const close=document.createElement('button');close.className='text-btn';close.type='button';close.textContent='閉じる';close.onclick=()=>root.remove();actions.append(link,close);root.append(actions);(document.querySelector('#settings-panel.active')||document.body).append(root);
 if(welcome&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('reduce-motion'))for(let i=0;i<14;i++){const spark=document.createElement('span');spark.className='festival-spark';spark.setAttribute('aria-hidden','true');spark.style.left=(4+i*7)+'%';spark.style.animationDelay=(i%4)*.04+'s';root.append(spark);setTimeout(()=>spark.remove(),1500);}
 setTimeout(()=>root.remove(),welcome?10000:7000);
}
export async function initFestivalEntry(){
 const entries=[],secrets=[];let active=false;
 const info=document.querySelector('.settings-about');if(info&&!info.querySelector('[data-festival-memories]')){const a=document.createElement('a');a.href='festival.html#memories';a.className='text-btn';a.dataset.festivalMemories='true';a.textContent='v10 Festival Memories';info.append(a);}
 async function secret(id){try{await updateFestival(s=>discoverEgg(s,festivalConfig,id));pop('10の秘密を発見！「'+eggNames[id]+'」バッジを獲得しました。');}catch(error){pop(error.message);}}
 function addSecret(selector,id,label,hint){const target=document.querySelector(selector);if(!target)return;const b=document.createElement('button');b.type='button';b.className='festival-secret';b.textContent=label;b.title=hint;b.setAttribute('aria-label',hint);b.onclick=()=>void secret(id);target.append(b);secrets.push(b);}
 async function refresh(){let w;try{w=eventWindow(festivalConfig);}catch{return;}if(w.phase!=='active'){for(const n of [...entries,...secrets])n.remove();document.getElementById('festival-pop')?.remove();active=false;return;}if(active)return;active=true;
 const target=document.querySelector('.app-footer')||document.querySelector('.mini-header');if(target){const a=document.createElement('a');a.className='text-btn festival-entry';a.href='festival.html';a.textContent='v10 Festival';a.title='公開記念・10日間限定';target.append(a);entries.push(a);}
 addSecret('.app-footer','home','10','数字10の小さな秘密');addSecret('.settings-about-version','version','X','バージョン10の秘密');addSecret('.mini-header','studio','1 + 0','Studioの10の秘密');
 if(document.querySelector('.app-footer'))try{let show=false;await updateFestival(s=>{if(!s.welcomeSeen){s.welcomeSeen=true;show=true;}});if(show)pop('Welcome to LifeTop v10.0!',true);}catch(error){pop(error.message);}
 }
 await refresh();if(festivalConfig.releaseAt)setInterval(()=>void refresh(),1000);
}
