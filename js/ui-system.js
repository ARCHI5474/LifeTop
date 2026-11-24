import {createColorPalette} from './color-palette.js?v=14.0.0';
import {DEFAULT_CLOCK_DESIGN,normalizeClockDesign,userConfig} from './config.js?v=14.0.0';
import {onLocalSave,writeStoredConfig} from './storage.js?v=14.0.0';
import {applyPasidea} from './pasidea.js?v=14.0.0';
const storageKey='lifetop_v1_0_data';
let initialized=false;
const cornerPresses=new WeakMap();
const rgb=hex=>hex.replace('#','').match(/../g).map(v=>parseInt(v,16));
function modeOf(config){return config?.colorMode==='light'?'light':'dark';}
function setScopeTheme(scope,mode){if(scope.dataset.theme!==mode)scope.dataset.theme=mode;}
function updateControls(mode){
 document.querySelectorAll('#settings-panel [data-ui-mode]').forEach(button=>{const active=button.dataset.uiMode===mode;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});
}
export function applyUISystemPreferences(config={}) {
 const root=document.documentElement,body=document.body;if(!body)return;const mode=modeOf(config);
 root.dataset.theme=mode;root.dataset.colorMode=mode;root.style.colorScheme=mode;
 setScopeTheme(body,mode);
 document.querySelectorAll('.ui-scope').forEach(scope=>setScopeTheme(scope,mode));
 const style=getComputedStyle(root);
 const tokens={background:'surface',surface:'surface-container-low',muted:'surface-container',primary:'primary',soft:'primary-container',onPrimary:'on-primary',onSoft:'on-primary-container',text:'on-surface',outline:'outline'};
 const base=Object.fromEntries(Object.entries(tokens).map(([key,name])=>[key,style.getPropertyValue('--pasidea-'+name).trim()]));
 const palette=createColorPalette({theme:config.theme,mode,base});
 const properties={background:'bg',surface:'surface',muted:'surface-muted',primary:'override',hover:'hover-override',pressed:'pressed-override',soft:'soft-override',onPrimary:'on-primary',onSoft:'on-soft',outline:'outline'};
 for(const [key,name] of Object.entries(properties))root.style.setProperty('--ui-accent-'+name,palette[key]);
 const hasCustomBackground=Boolean(config.bgImage)||(Boolean(config.bgType)&&config.bgType!=='gradient-blue');
 body.classList.toggle('has-custom-background',hasCustomBackground);
 root.classList.toggle('reduce-motion',Boolean(config.reduceMotion));
 body.dataset.clockDesign=normalizeClockDesign(config.clockDesign)??DEFAULT_CLOCK_DESIGN;
 body.style.setProperty('--ui-clock-font',body.dataset.clockDesign==='digital'?'ui-monospace, Consolas, monospace':'var(--ui-font)');
 const primary=getComputedStyle(body).getPropertyValue('--ui-primary').trim();
 if(/^#[a-f0-9]{6}$/i.test(primary))root.style.setProperty('--ui-primary-rgb',rgb(primary).join(', '));
 root.style.backgroundColor=palette.background;
 updateControls(mode);
}
function restorePreferences(){try{applyUISystemPreferences(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{applyUISystemPreferences({});}}
function setMode(mode){
 if(!['dark','light'].includes(mode))return;
 const previous=userConfig.colorMode;
 try{
  const raw=localStorage.getItem(storageKey),stored=raw?JSON.parse(raw):{...userConfig};
  if(!stored||typeof stored!=='object'||Array.isArray(stored))throw Error('保存データを読み込めません。');
  userConfig.colorMode=mode;
  // Change only the preference; Studio and Festival must not overwrite home content.
  writeStoredConfig({...stored,colorMode:mode});
  applyUISystemPreferences({...stored,colorMode:mode});
 }catch{
  userConfig.colorMode=previous;restorePreferences();
  let message=document.getElementById('ui-theme-error');if(!message){message=document.createElement('p');message.id='ui-theme-error';message.className='ui-theme-error';message.setAttribute('role','alert');(document.querySelector('.dashboard-header')||document.querySelector('.mini-header')||document.body).append(message);}message.textContent='表示モードを保存できませんでした。ブラウザの保存設定を確認してください。';
 }
}

function pressButtonCorners(event) {
 const root=document.documentElement;
 if(!event.isTrusted||root.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const button=event.target.closest('button,a.pasidea-btn,a.text-btn,label[role=button]');
 if(!button||button.matches(':disabled,[aria-disabled=true]'))return;
 const style=getComputedStyle(button);
 const duration=parseFloat(style.getPropertyValue('--pasidea-duration-morph'));
 const hold=parseFloat(style.getPropertyValue('--pasidea-duration-press'));
 cornerPresses.get(button)?.();
 let timer;
 function clear() {
  clearTimeout(timer);
  button.removeEventListener('transitionend',finish);
  delete button.dataset.pasideaPress;
  cornerPresses.delete(button);
 }
 function finish(change) {
  if(change.target!==button||!/^border-(?:top-left-)?radius$/.test(change.propertyName))return;
  clearTimeout(timer);
  timer=setTimeout(clear,hold);
 }
 cornerPresses.set(button,clear);
 button.addEventListener('transitionend',finish);
 button.dataset.pasideaPress='';
 timer=setTimeout(clear,duration*2+hold);
}

export function initUISystem(){
 restorePreferences();
 applyPasidea();
 if(!initialized){
  initialized=true;onLocalSave(restorePreferences);
  document.addEventListener('click',pressButtonCorners,true);
  document.addEventListener('click',event=>{
   if(event.target.closest('[aria-disabled="true"]')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null)restorePreferences();});
  document.addEventListener('click',event=>{const option=event.target.closest('#settings-panel [data-ui-mode]');if(option)setMode(option.dataset.uiMode);});
  new MutationObserver(records=>{const mode=document.documentElement.dataset.theme==='light'?'light':'dark';for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;applyPasidea(node);if(node.matches('.ui-scope'))setScopeTheme(node,mode);node.querySelectorAll('.ui-scope').forEach(scope=>setScopeTheme(scope,mode));}}).observe(document.body,{childList:true,subtree:true});
 }
 document.querySelectorAll('label.mini-file-label, label.background-upload-btn').forEach(label=>{
  const input=label.querySelector('input[type=file]');if(!input||label.dataset.keyboardReady)return;label.dataset.keyboardReady='true';label.tabIndex=0;label.setAttribute('role','button');
  label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click();}});
 });
}
