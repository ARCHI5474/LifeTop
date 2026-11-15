import {APP_VERSION} from './config.js?v=9.0';
import {openUIDialog} from './ui-dialog.js';

const storageKey='lifetop_version_eggs_v1';
export const versionEggs=Object.freeze({'12.0':{name:'Twelve Lights',count:12}});
export function eggVersion(version){const match=/^(\d+)\.0(?:\.\d+)?$/.exec(version);return match&&Number(match[1])>=12?match[1]+'.0':null;}
export function readVersionEggs(storage=localStorage){
    const raw=storage.getItem(storageKey);if(raw===null)return {schema:1,versions:{}};
    const state=JSON.parse(raw);
    if(!state||state.schema!==1||!state.versions||Array.isArray(state.versions)||typeof state.versions!=='object'||Object.entries(state.versions).some(([key,value])=>!/^\d+\.0$/.test(key)||!value||!Number.isFinite(value.foundAt)))throw Error('発見記録を読み込めません。保存済みのデータは変更していません。');
    return state;
}
export function saveVersionEgg(version,storage=localStorage){
    if(!Object.hasOwn(versionEggs,version))throw Error('このバージョンには記念品がありません。');
    const state=readVersionEggs(storage);state.versions[version] ||= {foundAt:Date.now()};
    storage.setItem(storageKey,JSON.stringify(state));return state;
}
export function openVersionEgg(version){
    const egg=versionEggs[version];if(!egg||document.getElementById('version-egg-dialog'))return;
    const dialog=document.createElement('dialog');dialog.id='version-egg-dialog';dialog.className='cc-dialog v12-dialog version-egg-dialog ui-scope';
    dialog.setAttribute('aria-labelledby','version-egg-title');
    dialog.innerHTML='<header class="v12-dialog-header"><div><p>LifeTop '+version+'</p><h2 id="version-egg-title">Twelve Lights</h2></div><button type="button" class="cc-control cc-icon" data-cancel aria-label="記念品を閉じる"></button></header><div class="version-egg-content"><p>12個の光を灯して、このバージョンの記念品を見つけよう。</p><div class="version-egg-lights"></div><p id="version-egg-status" role="status" aria-live="polite">0 / 12</p><button type="button" class="tonal-btn" id="version-egg-save" hidden>記録の保存を再試行</button><p class="v12-caption">Easter Eggは12.0から、整数のメジャーバージョンごとに登場します。発見記録はこのブラウザに保存されます。</p></div>';
    const status=dialog.querySelector('[role=status]'),retry=dialog.querySelector('#version-egg-save');
    let owned=false;try{owned=Boolean(readVersionEggs().versions[version]);}catch(error){status.textContent=error.message;}
    const lights=new Set();const complete=()=>{try{saveVersionEgg(version);status.textContent='Twelve Lightsを発見！ v'+version+'の記念品を保存しました。';retry.hidden=true;}catch(error){status.textContent='発見しましたが記録を保存できません。'+error.message;retry.hidden=false;}};
    for(let i=0;i<egg.count;i++){
        const button=document.createElement('button');button.type='button';button.className='version-egg-light';button.textContent=String(i+1).padStart(2,'0');button.setAttribute('aria-label','光 '+(i+1));button.setAttribute('aria-pressed',String(owned));
        if(owned)lights.add(i);
        button.onclick=()=>{if(lights.has(i))return;lights.add(i);button.setAttribute('aria-pressed','true');status.textContent=lights.size+' / 12';if(lights.size===egg.count)complete();};
        dialog.querySelector('.version-egg-lights').append(button);
    }
    if(owned)status.textContent='発見済み · Twelve Lights / v'+version;
    retry.onclick=complete;document.body.append(dialog);openUIDialog(dialog);
}
export function initVersionEggs(){
    const version=eggVersion(APP_VERSION);if(!version||!Object.hasOwn(versionEggs,version))return;
    const label=document.getElementById('app-version-label');if(!label)return;
    const trigger=document.createElement('button');trigger.type='button';trigger.className='text-btn version-egg-trigger';trigger.textContent='v'+version;trigger.setAttribute('aria-label','バージョン '+version);trigger.title='バージョンの数字を、もう少し探ってみよう';
    let clicks=0,last=0;trigger.onclick=()=>{if(Date.now()-last>1800)clicks=0;last=Date.now();if(++clicks===3){clicks=0;openVersionEgg(version);}};label.replaceWith(trigger);
}
