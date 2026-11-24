import {createMaterialIcon} from './icons.js?v=14.0.0';
import {onLocalSave} from './storage.js?v=14.0.0';
import {openCamera} from './camera.js?v=14.0.0';
import {openScreensaver} from './screensaver.js?v=14.0.0';
import {openEggLogs} from './egg-logs.js?v=14.0.0';
import {openPagePopup} from './page-popup.js?v=14.0.0';
const KEY='lifetop_quick_tiles_v13';
const items=[
 {id:'theme',name:'ダーク',icon:'contrast'}, {id:'live',name:'Live',icon:'air'},
 {id:'studio',name:'Studio',icon:'grid_view'}, {id:'search',name:'検索',icon:'search'},
 {id:'camera',name:'カメラ',icon:'photo_camera'}, {id:'screensaver',name:'スクリーンセーバー',icon:'fullscreen'},
 {id:'eggs',name:'Easter Egg Logs',icon:'auto_awesome'}, {id:'memories',name:'Festival Memories',icon:'celebration'},
 {id:'settings',name:'設定',icon:'settings'},
 {id:'messages',name:'Messages',icon:'forum',optional:true}, {id:'calendar',name:'カレンダー',icon:'calendar_month',optional:true}, {id:'timer',name:'タイマー',icon:'timer',optional:true}
];
let trigger;
export function toggleQuickPanel(){
 const panel=document.getElementById('quick-panel'),open=!panel.classList.contains('active');
 if(open&&document.getElementById('settings-panel').classList.contains('active'))window.toggleSettings();
 panel.classList.toggle('active',open);panel.inert=!open;document.getElementById('quick-overlay').classList.toggle('active',open);
 document.getElementById('quick-panel-open').setAttribute('aria-expanded',String(open));
 if(open){trigger=document.getElementById('quick-panel-open');panel.querySelector('button').focus({preventScroll:true});}
 else if(trigger?.isConnected)trigger.focus({preventScroll:true});
}
export function showQuickDetails(category='appearance'){
 if(document.getElementById('quick-panel')?.classList.contains('active'))toggleQuickPanel();
 if(!document.getElementById('settings-panel').classList.contains('active'))window.toggleSettings();
 document.getElementById('settings-tab-'+category)?.click();
}
export function resetQuickView(){} // Compatibility for existing imports; settings is now independent.
export function initQuickPanel(){
 const panel=document.getElementById('quick-panel'),grid=document.getElementById('quick-tiles'),editor=document.getElementById('quick-tile-editor'),edit=document.getElementById('quick-edit');
 let order=items.map(i=>i.id),hidden=items.filter(i=>i.optional).map(i=>i.id),editing=false;
 try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.schema===2&&Array.isArray(s.order)&&Array.isArray(s.hidden)){order=[...new Set([...s.order.filter(id=>order.includes(id)),...order])];hidden=[...new Set(s.hidden.filter(id=>order.includes(id)))];if(hidden.length===items.length)hidden.pop();}}catch{}
 const close=()=>{if(panel.classList.contains('active'))toggleQuickPanel();};
 const status=text=>document.getElementById('quick-status').textContent=text;
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify({schema:2,order,hidden}));status('');return true;}catch{status('変更を保存できませんでした。');return false;}};
 function run(id){
  if(id==='theme'){document.querySelector(`[data-ui-mode="${document.documentElement.dataset.theme==='dark'?'light':'dark'}"]`)?.click();return;}
  if(id==='live'){document.getElementById('live-home-enabled').click();return;}
  close();
  if(id==='settings')showQuickDetails();
  if(id==='camera')openCamera();
  if(id==='search')document.dispatchEvent(new Event('lifetop:search-open'));
  if(id==='studio')window.openMiniApps();
  if(id==='screensaver')openScreensaver();
  if(id==='eggs')void openEggLogs();
  if(id==='memories')openPagePopup('festival.html#memories','LifeTop14 Festival Memories');
  if(id==='messages')openPagePopup('messages.html','Messages');
  if(id==='calendar')document.dispatchEvent(new CustomEvent('lifetop:calendar-open'));
  if(id==='timer'){window.switchUtilityTab('clock');window.switchClockToolTab('timer');document.getElementById('timer-start-btn')?.scrollIntoView({block:'center'});document.getElementById('timer-start-btn')?.focus({preventScroll:true});}
 }
 function render(){
  const focus=document.activeElement?.dataset.quickFocus;
  grid.hidden=editing;grid.replaceChildren();editor.hidden=!editing;editor.replaceChildren();
  for(const id of order){
   const item=items.find(i=>i.id===id);
   if(!editing){
    if(hidden.includes(id))continue;
    const b=document.createElement('button');b.type='button';b.className='quick-tile';b.dataset.quickTile=id;b.dataset.quickFocus=id;
    b.append(createMaterialIcon(item.icon));const label=document.createElement('span');label.textContent=item.name;b.append(label);
    if(id==='theme'||id==='live'){const on=id==='theme'?document.documentElement.dataset.theme==='dark':document.body.classList.contains('live-home-enabled');b.setAttribute('aria-pressed',String(on));if(id==='theme')label.textContent=on?'ダーク':'ライト';}
    b.setAttribute('aria-label',id==='studio'?'Studioを開く':id==='camera'?'カメラを開く':label.textContent);
    b.onclick=()=>run(id);grid.append(b);continue;
   }
   const row=document.createElement('div');row.className='quick-edit-row';
   const label=document.createElement('span');label.className='quick-edit-label';label.append(createMaterialIcon(item.icon),document.createTextNode(item.name));
   const toggle=document.createElement('button');toggle.type='button';toggle.className='ui-switch';toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(!hidden.includes(id)));toggle.setAttribute('aria-label',item.name+'を表示');toggle.dataset.quickFocus=id+'-toggle';
   toggle.onclick=()=>{if(!hidden.includes(id)&&hidden.length===items.length-1){status('タイルを1つ以上表示してください。');return;}const before=hidden;hidden=hidden.includes(id)?hidden.filter(v=>v!==id):[...hidden,id];if(!persist())hidden=before;render();editor.querySelector(`[data-quick-focus="${id}-toggle"]`)?.focus({preventScroll:true});};
   const arrows=document.createElement('div');arrows.className='quick-edit-arrows';
   for(const [delta,caption,icon]of[[-1,'上へ','keyboard_arrow_up'],[1,'下へ','keyboard_arrow_down']]){const b=document.createElement('button');b.type='button';b.className='icon-btn';b.setAttribute('aria-label',item.name+'を'+caption);b.dataset.quickFocus=id+'-'+delta;b.append(createMaterialIcon(icon));const index=order.indexOf(id);b.disabled=index+delta<0||index+delta>=order.length;b.onclick=()=>{const before=[...order];[order[index],order[index+delta]]=[order[index+delta],order[index]];if(!persist())order=before;render();editor.querySelector(`[data-quick-focus="${id}-${delta}"]`)?.focus({preventScroll:true});};arrows.append(b);}
   row.append(label,toggle,arrows);editor.append(row);
  }
  if(focus){const target=panel.querySelector(`[data-quick-focus="${focus}"]`);(target?.disabled?target.closest('.quick-edit-row')?.querySelector('.ui-switch'):target)?.focus({preventScroll:true});}
 }
 edit.onclick=()=>{editing=!editing;edit.setAttribute('aria-pressed',String(editing));edit.textContent=editing?'完了':'編集';panel.classList.toggle('is-editing',editing);render();};
 panel.addEventListener('keydown',e=>{if(e.key!=='Tab'||e.defaultPrevented)return;const controls=[...panel.querySelectorAll('button,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}});
 onLocalSave(render);document.addEventListener('lifetop:live-change',render);new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});render();
}
