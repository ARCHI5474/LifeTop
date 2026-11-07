import {openUIDialog} from './ui-dialog.js';

export function openMiniApps(path='mini-apps.html') {
    const existing=document.getElementById('mini-app-dialog');
    if(existing)return;
    const url=new URL(path,location.href);
    if(url.origin!==location.origin||!url.pathname.endsWith('/mini-apps.html'))return;
    url.searchParams.set('embedded','1');
    const dialog=document.createElement('dialog');
    dialog.id='mini-app-dialog';dialog.className='cc-dialog mini-popup ui-scope';
    dialog.dataset.theme=document.body.dataset.theme||'dark';
    dialog.setAttribute('aria-labelledby','mini-popup-title');
    dialog.dataset.view='studio';
    dialog.innerHTML='<header class="mini-popup-header"><h2 id="mini-popup-title">Studio</h2><nav class="mini-popup-tabs" role="tablist" aria-label="Studio機能"><button type="button" class="cc-control cc-secondary-button is-active" data-view="studio" role="tab" aria-selected="true"><span class="material-symbols-outlined" aria-hidden="true">grid_view</span> Studio</button><button type="button" class="cc-control cc-secondary-button" data-view="games" role="tab" aria-selected="false"><span class="material-symbols-outlined" aria-hidden="true">sports_esports</span> GameBox</button></nav><button type="button" class="cc-control cc-icon" data-cancel aria-label="Studioを閉じる">×</button></header><p class="mini-popup-loading" role="status">アプリを読み込んでいます…</p><section class="mini-popup-studio" role="tabpanel" aria-label="Studio"><iframe title="Studioのミニアプリ一覧と編集画面"></iframe></section><section class="mini-popup-games" role="tabpanel" aria-label="GameBox" hidden></section>';
    document.body.append(dialog);
    const frame=dialog.querySelector('iframe');
    const gameModal=document.getElementById('game-modal');
    const originalParent=gameModal?.parentNode;
    const originalNextSibling=gameModal?.nextSibling;
    const gameHost=dialog.querySelector('.mini-popup-games');
    const tabs=[...dialog.querySelectorAll('[data-view]')];
    const setView=view=>{
        dialog.dataset.view=view;
        const games=view==='games';
        dialog.querySelector('.mini-popup-studio').hidden=games;
        gameHost.hidden=!games;
        dialog.querySelector('#mini-popup-title').textContent=games?'GameBox':'Studio';
        dialog.querySelector('[data-cancel]').setAttribute('aria-label',games?'GameBoxを閉じる':'Studioを閉じる');
        tabs.forEach(tab=>{const selected=tab.dataset.view===view;tab.classList.toggle('is-active',selected);tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    };
    if(gameModal){gameHost.append(gameModal);gameModal.setAttribute('role','region');gameModal.setAttribute('aria-modal','false');}
    const lifecycle=openUIDialog(dialog,{onRequestClose:async()=>{try{await frame.contentWindow?.flushMiniApp?.();return true;}catch{dialog.querySelector('[role=status]').hidden=false;dialog.querySelector('[role=status]').textContent='保存できませんでした。作業ファイルを保存してから閉じてください。';return false;}}});
    frame.addEventListener('load',()=>{
        dialog.querySelector('[role=status]').hidden=true;
        frame.contentDocument?.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&!event.isComposing&&event.keyCode!==229&&!event.defaultPrevented&&!frame.contentDocument.querySelector('dialog[open]')){event.preventDefault();void lifecycle.close();}
        });
    });
    dialog.addEventListener('lifetop:game-modal-state',event=>setView(event.detail.open?'games':'studio'));
    tabs.forEach(tab=>tab.addEventListener('click',()=>window.toggleGameModal?.(tab.dataset.view==='games')));
    tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
        if(event.isComposing||event.keyCode===229)return;
        const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:-1;
        if(next<0)return;event.preventDefault();tabs[next].click();tabs[next].focus();
    }));
    setView('studio');
    dialog.addEventListener('close',()=>{
        if(gameModal){
            if(gameModal.classList.contains('active'))window.toggleGameModal?.(false);
            gameModal.setAttribute('role','dialog');
            gameModal.setAttribute('aria-modal','true');
            if(originalParent)originalParent.insertBefore(gameModal,originalNextSibling?.parentNode===originalParent?originalNextSibling:null);
        }
        document.dispatchEvent(new Event('lifetop:files-updated'));
    });
    frame.src=url.href;
}
