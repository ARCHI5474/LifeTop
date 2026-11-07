export function initSyncOnboarding({login, openAccount}) {
    const el = id => document.getElementById(id);
    const dialog=el('sync-guide'), primary=el('sync-guide-primary'), badge=el('cloud-save-mode');
    let user=null, busy=false, step=0, trigger=null;
    const close = () => {dialog.close();if(trigger?.isConnected)trigger.focus({preventScroll:true});};
    const steps=[
        ['いつものLifeTopを、どの端末でも','Googleアカウントでログインすると、設定・ブックマーク・タスク・メモを同じアカウントの端末間で共有できます。'],
        ['いまのデータは、自動で引き継ぎ','ログイン後、この端末のデータを自動でクラウドへ移します。既存のタスク・ブックマーク・メモは両方残して統合。設定が異なる場合はクラウド側を優先します。移行前の内容もバックアップに残ります。'],
        ['ログインして、同期を始めよう','Googleの画面でアカウントを選ぶだけで初回移行します。その後は標準でアクセス3回に1回、自動同期。端末保存は毎回行います。設定から毎回・リアルタイム・手動にも変更できます。']
    ];
    const draw = () => {
        const [title,copy]=steps[step];
        el('sync-guide-title').textContent=title;el('sync-guide-copy').textContent=copy;
        el('sync-guide-progress').textContent=`${step+1} / 3 · 同期のはじめ方`;
        primary.textContent=busy?'ログインしています…':step<2?'次へ':user?'アカウントを確認':'Googleでログインして自動移行';
        primary.disabled=busy;el('sync-guide-back').hidden=step<=0;
        el('sync-guide-error').textContent='';
    };
    const open = () => {trigger=document.activeElement;step=0;draw();if(!dialog.open)dialog.showModal();};
    primary.addEventListener('click',()=>{if(busy)return;if(step>=0&&step<2){step++;draw();return;}if(user){close();openAccount();}else login();});
    el('sync-guide-back').addEventListener('click',()=>{step--;draw();});
    el('sync-guide-later').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    el('cloud-sync-guide').addEventListener('click',open);
    return {
        setUser(next){user=next;badge.textContent=user?'クラウド同期を準備中':'この端末に保存中';if(user&&dialog.open)close();},
        setStatus(state){badge.dataset.state=state;if(!user)return;const labels={synced:'クラウドに保存済み',syncing:'クラウドに保存中',checking:'同期を確認中',waiting:'入力後に同期',conflict:'同期の確認が必要',choice:'同期の確認が必要',error:'端末に保存・同期待ち',deferred:'端末に保存・次回同期待ち'};badge.textContent=labels[state]||'端末に保存中';},
        setBusy(value){busy=value;if(dialog.open)draw();},
        showError(message){if(dialog.open)el('sync-guide-error').textContent=message;},
    };
}
