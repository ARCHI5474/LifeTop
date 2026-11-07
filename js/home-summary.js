import {icon} from './canvas-ui.js?v=10.0-ui8';
import {openUIDialog} from './ui-dialog.js';

const signs=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const names=['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
const key='lifetop-v10-horoscope';
let current=null,request=0;

function readCache(){
 try{const cache=JSON.parse(localStorage.getItem(key)||'{}');return cache&&typeof cache==='object'&&!Array.isArray(cache)?cache:{};}
 catch{return {};}
}

async function fetchDaily(sign,date){
 const response=await fetch(`https://api.astroway.info/v1/public/horoscope/daily?sign=${sign}&date=${date}&lang=ja`,{
  signal:AbortSignal.timeout(20000),credentials:'omit',referrerPolicy:'no-referrer'
 });
 if(!response.ok)throw Error('星座占いを取得できません。');
 const body=await response.json(),data=body.data;
 if(!body.ok||data?.sign!==sign||typeof data.horoscope!=='string'||!Number.isFinite(data.energy?.score)){
  throw Error('星座占いの順位データを確認できません。');
 }
 return {...data,footer:String(body._footer||'Powered by AstroWay'),fallback:data.fallback||body.fallback};
}

function showMessages(){
 const d=document.createElement('dialog');
 d.className='cc-dialog cc-form-dialog ui-scope';
 d.dataset.theme=document.body.dataset.theme;
 d.innerHTML='<header class="cc-form-header"><h2>Messages</h2><button class="cc-control cc-icon" data-cancel aria-label="閉じる">×</button></header><div class="cc-form-fields"><p>近日実装</p></div>';
 document.body.append(d);
 openUIDialog(d);
}

export function initHomeSummary(){
 const row=document.querySelector('.weather-summary-row');
 if(!row)return;
 row.setAttribute('aria-label','今日の情報');
 row.insertAdjacentHTML('beforeend',`
  <button type="button" id="home-horoscope-card" class="weather-summary-card glass-card home-summary-card" aria-label="星座占いを開く">
   <span class="home-summary-icon" aria-hidden="true">${icon('star')}</span>
   <span class="weather-summary-copy"><span class="weather-summary-label">星座占い</span><span class="weather-summary-values"><strong id="horoscope-sign-label">星座を取得中</strong><span id="horoscope-rank" role="status">順位を取得中…</span></span></span>
   <span class="material-symbols-outlined home-summary-chevron" aria-hidden="true">chevron_right</span>
  </button>
  <button type="button" id="home-messages-card" class="weather-summary-card glass-card home-summary-card">
   <span class="home-summary-icon" aria-hidden="true">${icon('forum')}</span>
   <span class="weather-summary-copy"><span class="weather-summary-label">Messages</span><span class="weather-summary-values"><strong>メッセージ</strong></span></span>
   <span class="material-symbols-outlined home-summary-chevron" aria-hidden="true">chevron_right</span>
  </button>
  <button type="button" id="home-calendar-card" class="weather-summary-card glass-card home-summary-card">
   <span class="home-summary-icon" aria-hidden="true">${icon('calendar_month')}</span>
   <span class="weather-summary-copy"><span class="weather-summary-label">カレンダー</span><span class="weather-summary-values"><strong id="home-calendar-date"></strong></span></span>
   <span class="material-symbols-outlined home-summary-chevron" aria-hidden="true">chevron_right</span>
  </button>`);
 document.getElementById('home-calendar-date').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric'}).format(new Date());
 const rank=document.getElementById('horoscope-rank'),signLabel=document.getElementById('horoscope-sign-label');
 const cache=readCache();
 let selectedSign=signs.includes(cache.sign)?cache.sign:signs[0];
 signLabel.textContent=names[signs.indexOf(selectedSign)];
 let dialog=null;
 function openDetails(){
  const d=document.createElement('dialog');
  d.className='cc-dialog cc-form-dialog ui-scope';
  d.dataset.theme=document.body.dataset.theme;
  d.innerHTML='<header class="cc-form-header"><h2>星座占い</h2><button class="cc-control cc-icon" data-cancel aria-label="閉じる">×</button></header><div class="cc-form-fields"><label>星座<select id="horoscope-dialog-sign"></select></label><p id="horoscope-dialog-rank" role="status">順位を取得中…</p><p class="horoscope-date"></p><p class="horoscope-reading"></p><p class="cc-secondary horoscope-footer"></p><button type="button" class="cc-control cc-quiet" id="horoscope-dialog-retry">再試行</button></div>';
  const dialogSelect=d.querySelector('#horoscope-dialog-sign');
  dialogSelect.innerHTML=signs.map((sign,index)=>`<option value="${sign}">${names[index]}</option>`).join('');
  dialogSelect.value=selectedSign;
  dialogSelect.addEventListener('change',()=>{selectedSign=dialogSelect.value;signLabel.textContent=names[signs.indexOf(selectedSign)];void load();});
  d.querySelector('#horoscope-dialog-retry').addEventListener('click',()=>void load(true));
  document.body.append(d);
  dialog=d;
  openUIDialog(d);
  updateDialog();
  if(!current)void load();
 }
 function updateDialog(){
  if(!dialog?.isConnected)return;
  const detail=dialog.querySelector('.horoscope-reading'),date=dialog.querySelector('.horoscope-date'),footer=dialog.querySelector('.horoscope-footer');
  const selected=current?.sign===selectedSign?current:null;
  dialog.querySelector('#horoscope-dialog-sign').value=selectedSign;
  dialog.querySelector('#horoscope-dialog-rank').textContent=selected?`${rank.textContent}`:rank.textContent;
  detail.textContent=selected?.horoscope||'';
  date.textContent=selected?selected.date+(selected.fallback?'（過去の配信を表示）':''):'';
  footer.textContent=selected?.footer||'';
 }
 document.getElementById('home-horoscope-card').addEventListener('click',openDetails);
 document.getElementById('home-messages-card').addEventListener('click',showMessages);
 document.getElementById('home-calendar-card').addEventListener('click',()=>document.dispatchEvent(new CustomEvent('lifetop:calendar-open')));
 void load();

 async function load(force=false){
  const id=++request,sign=selectedSign,date=new Date().toISOString().slice(0,10);
  current=null;
  signLabel.textContent=names[signs.indexOf(sign)];
  document.getElementById('home-horoscope-card').setAttribute('aria-label',`${names[signs.indexOf(sign)]}の星座占いを開く`);
  rank.textContent='順位を取得中…';
  rank.removeAttribute('aria-label');
  const stored=readCache();
  const sameDate=!force&&stored.date===date;
  const scores=sameDate&&stored.scores&&typeof stored.scores==='object'?{...stored.scores}:{};
  const legacyData=sameDate&&stored.data?.sign===sign?stored.data:(sameDate&&stored.sign===sign&&typeof stored.horoscope==='string'?stored:null);
  let selectedData=legacyData;
  try{
   await Promise.all(signs.map(async item=>{
    if(Number.isFinite(scores[item])&&!(item===sign&&!selectedData))return null;
    const data=await fetchDaily(item,date);
    scores[item]=data.energy.score;
    if(item===sign)selectedData=data;
    return data;
   }));
   if(id!==request)return;
   const score=scores[sign];
   if(!Number.isFinite(score)||!selectedData)throw Error('星座占いの順位データを確認できません。');
   const position=1+signs.filter(item=>scores[item]>score).length;
   current=selectedData;
   rank.textContent=`${position}位`;
   document.getElementById('home-horoscope-card').setAttribute('aria-label',`${names[signs.indexOf(sign)]} ${position}位、詳しく`);
   updateDialog();
   try{localStorage.setItem(key,JSON.stringify({date,sign,scores,data:selectedData}));}
   catch(error){console.warn('星座占いを保存できませんでした。',error);}
  }catch(error){
   if(id!==request)return;
   rank.textContent='順位を取得できません';
   rank.setAttribute('aria-label',error.message||'星座占いの順位を取得できません。');
   updateDialog();
  }
 }
}
