export const SYNC_GUIDE_KEY = 'lifetop_sync_guide_v1';
export const REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;
export function shouldShowSyncPrompt(p, now = Date.now()) {
    return !p.optedOut && (!Number.isFinite(p.nextPromptAt) || now >= p.nextPromptAt);
}

export function initSyncOnboarding({login, openAccount}) {
    const el = id => document.getElementById(id);
    const dialog=el('sync-guide'), primary=el('sync-guide-primary'), header=el('header-google-account'), badge=el('cloud-save-mode');
    let user=null, busy=false, ready=false, step=0, trigger=null, preferences={};
    const readPreferences = () => {
        try { const data=JSON.parse(localStorage.getItem(SYNC_GUIDE_KEY)||'{}'); return data && typeof data==='object' && !Array.isArray(data)?data:{}; } catch {return {};}
    };
    preferences=readPreferences();
    const persist = () => {try{localStorage.setItem(SYNC_GUIDE_KEY,JSON.stringify(preferences));}catch{}};
    const snooze = () => {preferences.nextPromptAt=Date.now()+REMINDER_INTERVAL;persist();};
    const close = () => {dialog.close();if(trigger?.isConnected)trigger.focus({preventScroll:true});};
    const steps=[
        ['いつものLifeTopを、どの端末でも','Googleアカウントでログインすると、設定・ブックマーク・タスク・メモを同じアカウントの端末間で共有できます。'],
        ['いまのデータは、自動で引き継ぎ','ログイン後、この端末のデータを自動でクラウドへ移します。既存のタスク・ブックマーク・メモは両方残して統合。設定が異なる場合はクラウド側を優先します。移行前の内容もバックアップに残ります。'],
        ['ログインして、同期を始めよう','Googleの画面でアカウントを選ぶだけで初回移行します。その後は標準でアクセス3回に1回、自動同期。端末保存は毎回行います。設定から毎回・リアルタイム・手動にも変更できます。']
    ];
    const draw = () => {
        const promotion=step<0;
        const [title,copy]=promotion?['Googleで、データを引き継ごう','この端末のタスクやメモを、別の端末でも使いませんか？ Googleでログインすると、いまのデータを自動で移行します。']:steps[step];
        el('sync-guide-title').textContent=title;el('sync-guide-copy').textContent=copy;
        el('sync-guide-progress').textContent=promotion?'Google 同期':`${step+1} / 3 · 同期のはじめ方`;
        primary.textContent=busy?'ログインしています…':!promotion&&step<2?'次へ':user?'アカウントを確認':'Googleでログインして自動移行';
        primary.disabled=busy;el('sync-guide-back').hidden=step<=0;el('sync-guide-learn').hidden=!promotion;
        el('sync-guide-error').textContent='';
    };
    const open = tutorial => {trigger=document.activeElement;step=tutorial?0:-1;preferences.tutorialSeen=true;snooze();draw();if(!dialog.open)dialog.showModal();};
    primary.addEventListener('click',()=>{if(busy)return;if(step>=0&&step<2){step++;draw();return;}if(user){close();openAccount();}else login();});
    el('sync-guide-back').addEventListener('click',()=>{step--;draw();});
    el('sync-guide-learn').addEventListener('click',()=>{step=0;draw();});
    el('sync-guide-later').addEventListener('click',()=>{snooze();close();});
    el('sync-guide-never').addEventListener('click',()=>{preferences.optedOut=true;persist();close();});
    dialog.addEventListener('cancel',event=>{event.preventDefault();snooze();close();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    el('cloud-sync-guide').addEventListener('click',()=>open(true));
    header.hidden=false;header.addEventListener('click',()=>user?openAccount():open(true));
    const check = () => {
        if(!ready||user||busy||dialog.open||document.hidden)return;
        if(el('loading-screen')||document.querySelector('[role="dialog"].active, dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
        preferences=readPreferences();
        if(shouldShowSyncPrompt(preferences))open(!preferences.tutorialSeen);
    };
    setTimeout(check,6000);setInterval(check,30000);document.addEventListener('visibilitychange',check);
    return {
        setUser(next){ready=true;user=next;header.textContent=user?'同期を確認':'Googleでログイン';header.setAttribute('aria-label',user?'Googleアカウントと同期状況を確認':'Googleログインの案内を開く');badge.textContent=user?'クラウド同期を準備中':'この端末に保存中';if(user){snooze();if(dialog.open)close();}},
        setStatus(state){badge.dataset.state=state;if(!user)return;const labels={synced:'クラウドに保存済み',syncing:'クラウドに保存中',checking:'同期を確認中',waiting:'入力後に同期',conflict:'同期の確認が必要',choice:'同期の確認が必要',error:'端末に保存・同期待ち',deferred:'端末に保存・次回同期待ち'};badge.textContent=labels[state]||'端末に保存中';header.textContent=state==='synced'?'Google同期済み':'同期を確認';},
        setBusy(value){busy=value;header.disabled=value;if(dialog.open)draw();},
        showError(message){if(dialog.open)el('sync-guide-error').textContent=message;},
        snooze
    };
}
