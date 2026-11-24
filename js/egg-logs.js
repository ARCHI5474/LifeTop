import {readVersionEggs,versionEggs} from './version-eggs.js?v=14.0.0';
import {readFestival,eggNames} from './festival-model.js?v=14.0.0';
import {openUIDialog} from './ui-dialog.js?v=14.0.0';
export async function openEggLogs(){
 if(document.getElementById('egg-logs-dialog'))return;
 const dialog=document.createElement('dialog');dialog.id='egg-logs-dialog';dialog.className='cc-dialog ui-scope egg-logs-dialog';dialog.setAttribute('aria-labelledby','egg-logs-title');dialog.innerHTML='<header class="v12-dialog-header"><h2 id="egg-logs-title">Easter Egg Logs</h2><button type="button" class="icon-btn close-action" data-cancel aria-label="Easter Egg Logsを閉じる"></button></header><div class="egg-logs-content"><p role="status">記録を読み込んでいます。</p><ul class="egg-log-list"></ul></div>';
 document.body.append(dialog);openUIDialog(dialog);
 try{
  const versions=readVersionEggs(),festival=await readFestival();if(!dialog.isConnected)return;
  const list=dialog.querySelector('ul');const entries=[...Object.entries(versionEggs).map(([v,egg])=>({name:'v'+v+' · '+egg.name,at:versions.versions[v]?.foundAt})),...Object.entries(eggNames).map(([id,name])=>({name:'Festival · '+name,at:festival.eggs?.[id]}))];
  for(const entry of entries){const li=document.createElement('li'),name=document.createElement('strong'),date=document.createElement('span');name.textContent=entry.name;date.textContent=entry.at?new Date(entry.at).toLocaleDateString('ja-JP')+' 発見':'未発見';li.dataset.found=String(!!entry.at);li.append(name,date);list.append(li);}
  dialog.querySelector('[role=status]').textContent=entries.filter(e=>e.at).length+' / '+entries.length+' 発見';
 }catch{if(dialog.isConnected)dialog.querySelector('[role=status]').textContent='記録を読み込めませんでした。保存内容は変更していません。';}
}
