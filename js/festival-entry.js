import {initHiddenTens} from './festival-hunt.js?v=10.1-hide1';
import {openFestival} from './festival-popup.js';
import {festivalConfig} from './festival-config.js';
import {eventWindow,eggNames,updateFestival,discoverEgg} from './festival-model.js';
function confetti(root,count=32){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))return;
 for(let i=0;i<count;i++){const spark=document.createElement('span');spark.className='festival-spark';spark.setAttribute('aria-hidden','true');spark.style.left=(3+(i*37)%94)+'%';spark.style.background=['#ffd466','#ff7aa8','#80eeea','#bca0ff'][i%4];spark.style.animationDelay=(i%7)*.07+'s';root.append(spark);setTimeout(()=>spark.remove(),2800);}
}
function pop(message,welcome=false){
 document.getElementById('festival-pop')?.remove();const root=document.createElement('aside');root.id='festival-pop';root.className='festival-pop';root.setAttribute('aria-label',welcome?'v10公開記念':'記念バッジ');
 const text=document.createElement('p');text.textContent=message;text.setAttribute('role','status');root.append(text);const actions=document.createElement('div');actions.className='mini-tools';const link=document.createElement('a');link.className='tonal-btn';link.href='festival.html';link.textContent=welcome?'Festivalを見る':'記念品を見る';const close=document.createElement('button');close.className='text-btn';close.type='button';close.textContent='閉じる';close.onclick=()=>root.remove();link.onclick=e=>{e.preventDefault();root.remove();openFestival();};actions.append(link,close);root.append(actions);(document.querySelector('#settings-panel.active')||document.body).append(root);
 if(welcome){root.classList.add('festival-welcome');confetti(root,36);}
 if(!welcome)setTimeout(()=>root.remove(),7000);
}
export async function initFestivalEntry(){
 if(document.querySelector('[data-festival-entry-ready]'))return;
 initHiddenTens(festivalConfig);
 const entries=[],secrets=[];let active=false;
 const entrance=document.querySelector('.app-footer')||document.querySelector('.mini-header');
 if(entrance){const a=document.createElement('a');a.href='festival.html';a.className='text-btn festival-entry';a.dataset.festivalEntryReady='true';a.textContent='v10 Festival';a.onclick=e=>{e.preventDefault();openFestival();};entrance.append(a);const ten=document.createElement('button');ten.type='button';ten.className='festival-secret';ten.textContent='10';ten.setAttribute('aria-label','v10の歓迎メッセージ');ten.onclick=()=>{if(eventWindow(festivalConfig).phase==='active')pop('Welcome to LifeTop v10.0!',true);else openFestival();};entrance.append(ten);}
 const info=document.querySelector('.settings-about');if(info&&!info.querySelector('[data-festival-memories]')){const a=document.createElement('a');a.href='festival.html#memories';a.className='text-btn';a.dataset.festivalMemories='true';a.textContent='v10 Festival Memories';info.append(a);}
 async function secret(id){try{await updateFestival(s=>discoverEgg(s,festivalConfig,id));pop('10の秘密を発見！「'+eggNames[id]+'」バッジを獲得しました。');}catch(error){pop(error.message);}}
 function addSecret(selector,id,label,hint){const target=document.querySelector(selector);if(!target)return;const b=document.createElement('button');b.type='button';b.className='festival-secret';b.textContent=label;b.title=hint;b.setAttribute('aria-label',hint);b.onclick=()=>void secret(id);target.append(b);secrets.push(b);}
 let banner;
 const home=document.querySelector('.hero-section');
 if(home){banner=document.createElement('section');banner.className='festival-banner';banner.setAttribute('aria-label','LifeTop v10.0 Festival 開催中');banner.hidden=true;
 banner.innerHTML='<div class="festival-banner-art" aria-hidden="true"><span>10</span></div><div class="festival-banner-copy"><p class="festival-banner-kicker">10 DAYS CELEBRATION</p><h2>LifeTop v10.0 <em>Festival!</em></h2><p class="festival-banner-time"></p></div><a class="festival-banner-cta" href="festival.html">参加する <span aria-hidden="true">↗</span></a>';
 banner.querySelector('a').onclick=e=>{e.preventDefault();openFestival();};home.parentNode.prepend(banner);}
 async function refresh(){let w;try{w=eventWindow(festivalConfig);}catch{return;}if(banner){banner.hidden=w.phase!=='active';if(w.phase==='active'){const seconds=Math.max(0,Math.floor((w.end-Date.now())/1000));banner.querySelector('.festival-banner-time').textContent='終了まで '+Math.floor(seconds/86400)+'日 '+String(Math.floor(seconds/3600)%24).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+' · 無料 / 登録不要';}}
 if(w.phase!=='active'){for(const n of [...entries,...secrets])n.remove();document.getElementById('festival-pop')?.remove();active=false;return;}if(active)return;active=true;if(banner)confetti(banner,32);
 addSecret('.settings-about-version','version','X','バージョン10の秘密');addSecret('.mini-header','studio','1 + 0','Studioの10の秘密');
 if(document.querySelector('.app-footer'))try{let show=false;await updateFestival(s=>{if(!s.welcomeSeen){s.welcomeSeen=true;show=true;}});if(show)pop('Welcome to LifeTop v10.0!',true);}catch(error){pop(error.message);}
 }
 await refresh();if(festivalConfig.startAt||festivalConfig.releaseAt)setInterval(()=>void refresh(),1000);
}
