import {userConfig} from './config.js?v=8.0';
import {normalizeSyncTiming} from './sync-timing.js?v=8.0';

export function initSyncExplanation() {
    const dialog=document.getElementById('sync-explanation');
    const trigger=document.getElementById('sync-explanation-open');
    trigger.addEventListener('click',()=>{
        const labels={every3:'アクセス3回に1回（標準）',everyVisit:'アクセスするたび',live:'リアルタイム',manual:'手動のみ'};
        document.getElementById('sync-explanation-mode').textContent=`現在の設定：${labels[normalizeSyncTiming(userConfig.syncTiming)]}`;
        dialog.showModal();
    });
    const close=()=>{dialog.close();trigger.focus({preventScroll:true});};
    document.getElementById('sync-explanation-close').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
}
