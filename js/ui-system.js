import {fontStyles,userConfig} from './config.js?v=9.0';
import {onLocalSave,writeStoredConfig} from './storage.js?v=9.0';
const storageKey='lifetop_v1_0_data';
let initialized=false;
const hex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const rgb=hex=>hex.replace('#','').match(/../g).map(v=>parseInt(v,16));
function luminance(values){const c=values.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
function modeOf(config){return config?.colorMode==='light'?'light':'dark';}
function setScopeTheme(scope,mode){scope.dataset.theme=mode;}
function updateControls(mode){
 document.querySelectorAll('#settings-panel [data-ui-mode]').forEach(button=>{const active=button.dataset.uiMode===mode;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});
}
export function applyUISystemPreferences(config={}) {
 const root=document.documentElement,body=document.body;if(!body)return;const mode=modeOf(config);
 root.dataset.theme=mode;root.dataset.colorMode=mode;root.style.colorScheme=mode;
 document.querySelectorAll('.ui-scope').forEach(scope=>setScopeTheme(scope,mode));
 const names=['--ui-accent-override','--ui-accent-hover-override','--ui-accent-pressed-override','--ui-accent-soft-override'];
 names.forEach(name=>root.style.removeProperty(name));
 const palette=getComputedStyle(body),background=palette.getPropertyValue('--ui-bg').trim(),surface=palette.getPropertyValue('--ui-surface').trim();
 if(typeof config.theme==='string'&&/^#[a-f0-9]{6}$/i.test(config.theme)&&config.theme.toLowerCase()!=='#2f75a8'){
  let primary=rgb(config.theme);const light=mode==='light';
  for(let i=0;i<50&&contrast(primary,rgb(background))<4.5;i++)primary=primary.map(v=>light?v*.93:v+(255-v)*.07);
  primary=primary.map(Math.round);const color=hex(primary);
  root.style.setProperty('--ui-accent-override',color);
  root.style.setProperty('--ui-accent-hover-override',hex(primary.map(v=>light?v*.9:v+(255-v)*.2)));
  root.style.setProperty('--ui-accent-pressed-override',hex(primary.map(v=>light?v*.8:v+(255-v)*.4)));
  root.style.setProperty('--ui-accent-soft-override',`color-mix(in srgb, ${color} 18%, ${surface})`);
 }
 const hasCustomBackground=Boolean(config.bgImage)||(Boolean(config.bgType)&&config.bgType!=='gradient-blue');
 body.classList.toggle('has-custom-background',hasCustomBackground);
 root.classList.toggle('reduce-motion',Boolean(config.reduceMotion));
 const font=fontStyles.find(item=>item.family===config.fontFamily);body.style.setProperty('--ui-clock-font',font&&font!==fontStyles[0]?font.family:'var(--ui-font)');
 const primary=getComputedStyle(body).getPropertyValue('--ui-primary').trim();
 if(/^#[a-f0-9]{6}$/i.test(primary))root.style.setProperty('--ui-primary-rgb',rgb(primary).join(', '));
 root.style.backgroundColor=hasCustomBackground?'transparent':background;
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

export function initUISystem(){
 restorePreferences();
 if(!initialized){
  initialized=true;onLocalSave(restorePreferences);
  window.addEventListener('storage',event=>{if(event.key===storageKey)restorePreferences();});
  document.addEventListener('click',event=>{const option=event.target.closest('#settings-panel [data-ui-mode]');if(option)setMode(option.dataset.uiMode);});
  new MutationObserver(records=>{const mode=document.body.dataset.theme;for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches('.ui-scope'))setScopeTheme(node,mode);node.querySelectorAll('.ui-scope').forEach(scope=>setScopeTheme(scope,mode));}}).observe(document.body,{childList:true,subtree:true});
 }
 document.querySelectorAll('label.mini-file-label, label.background-upload-btn').forEach(label=>{
  const input=label.querySelector('input[type=file]');if(!input||label.dataset.keyboardReady)return;label.dataset.keyboardReady='true';label.tabIndex=0;label.setAttribute('role','button');
  label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click();}});
 });
}
