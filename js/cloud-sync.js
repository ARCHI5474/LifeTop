import { cloudSyncConfig } from './firebase-config.js?v=8.0';
import { createFirebaseAdapter } from './firebase-adapter.js?v=8.0';
import { createSyncEngine, SYNC_RECOVERY_KEY, SYNC_META_KEY } from './sync-engine.js?v=8.0';
import { userConfig, STORAGE_KEY, DEFAULT_SETTINGS } from './config.js?v=8.0';
import { onLocalSave, writeStoredConfig } from './storage.js?v=8.0';
import { createBackup, parseBackup } from './data-management.js?v=8.0';
import { mergeInitialData } from './sync-migration.js?v=8.0';
import { initSyncOnboarding } from './sync-onboarding.js?v=8.0';
import {beginSyncVisit, automaticSyncDue, normalizeSyncTiming} from './sync-timing.js?v=8.0';

// Sync only the content advertised in the UI. Cached location, health logs,
// game scores, auth tokens and legacy fields never enter a cloud payload.
export function selectSyncData(config) {
    return Object.fromEntries([...Object.keys(DEFAULT_SETTINGS).filter(key=>key!=='syncTiming'), 'memo', 'memoHtml', 'bookmarks', 'todoList'].map(key => [key, config[key]]));
}

export async function initCloudSync(refreshUI) {
    const status = document.getElementById('cloud-sync-status');
    const account = document.getElementById('cloud-sync-account');
    const login = document.getElementById('cloud-sync-login');
    const logout = document.getElementById('cloud-sync-logout');
    const retry = document.getElementById('cloud-sync-retry');
    const useLocal = document.getElementById('cloud-sync-local');
    const useCloud = document.getElementById('cloud-sync-cloud');
    const recovery = document.getElementById('cloud-sync-recovery');
    const show = (element, visible) => { element.hidden = !visible; };
    const config = cloudSyncConfig.firebase;
    if (!cloudSyncConfig.enabled || !['apiKey','authDomain','projectId','appId'].every(key => typeof config[key] === 'string' && config[key].trim())) {
        status.textContent = 'Googleアカウント同期は準備中です。現在はこの端末に保存されます。';
        return;
    }
    let adapter;
    let watcher;
    let timer;
    let activeUser = null;
    let signingOut = false;
    let engine;
    let onboarding;
    let visit = 0;
    let migrating = false;
    let lastState = '';
    let lastTiming = normalizeSyncTiming(userConfig.syncTiming);
    const visits = new Map();
    const timing = () => normalizeSyncTiming(userConfig.syncTiming);
    const automatic = () => !!activeUser && !signingOut && automaticSyncDue(timing(), visit, migrating);
    const timingNote = document.getElementById('cloud-sync-timing-status');
    const explainTiming = () => {
        const labels={every3:'アクセス3回に1回',everyVisit:'アクセスするたび',live:'リアルタイム',manual:'手動のみ'};
        timingNote.textContent = `同期タイミング：${labels[timing()]}${activeUser?` · 今回は${(visit-1)%3+1}/3回目`:''}。アクセス回数はこの端末のブラウザごとに数えます。`;
    };
    const defer = () => {
        if (!activeUser || ['choice','conflict'].includes(lastState)) return;
        render({status:'deferred',uid:activeUser.uid,message:timing()==='manual'?'変更は端末に保存済みです。「今すぐ同期」でクラウドへ反映できます。':'変更は端末に保存済みです。次の同期対象アクセスで自動反映します。「今すぐ同期」も使えます。'});
    };
    const schedule = () => {
        if (!automatic() || navigator.onLine === false) return;
        clearTimeout(timer);
        timer = setTimeout(() => void engine.sync(), 1500);
    };
    const configureWatch = () => {
        watcher?.(); watcher=null;
        if (activeUser && !signingOut && timing()==='live') watcher=adapter.watch(activeUser.uid,schedule,()=>{
            render({status:'error',uid:activeUser.uid,message:'クラウドに接続できません。端末の変更は残っています。接続回復後に再試行します。'});
        });
    };
    const render = ({status:state, message, uid}) => {
        lastState=state;
        if (state==='synced') migrating=false;
        status.textContent = message;
        status.dataset.state = state;
        onboarding?.setStatus(state);
        const choice = ['choice','first-upload','conflict'].includes(state);
        show(useLocal, choice);
        show(useCloud, choice && state !== 'first-upload');
        useLocal.textContent = state === 'first-upload' ? 'この端末のデータで同期を開始' : 'この端末のデータを残す';
        show(retry, !!uid && !choice);
        retry.disabled = ['syncing','checking'].includes(state);
        useLocal.disabled = useCloud.disabled = state === 'syncing';
        try { show(recovery, !!localStorage.getItem(SYNC_RECOVERY_KEY)); } catch { show(recovery, false); }
    };
    const readLocal = () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        return selectSyncData(raw ? JSON.parse(raw) : userConfig);
    };
    try {
        status.textContent = 'Googleアカウント同期を準備しています…';
        adapter = await createFirebaseAdapter(config);
        onboarding = initSyncOnboarding({login:()=>login.click(),openAccount:()=>{
            if (!document.getElementById('settings-panel').classList.contains('active')) window.toggleSettings();
            document.getElementById('settings-tab-profile').click();
        }});
        show(document.getElementById('cloud-sync-guide'),true);
        engine = createSyncEngine({remote:adapter,storage:localStorage,readLocal,
            autoMigrate:true,mergeInitialData,
            validate:payload => selectSyncData(parseBackup(createBackup(JSON.parse(payload)))),
            applyCloud:data => {
                const raw = localStorage.getItem(STORAGE_KEY);
                const merged = {...(raw ? JSON.parse(raw) : userConfig), ...data};
                writeStoredConfig(merged, false);
                refreshUI(merged);
            },
            canApplyCloud:() => !document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') && !document.getElementById('bookmark-dialog')?.classList.contains('active'),
            onState:render
        });
        adapter.onAuth(user => {
            clearTimeout(timer);
            watcher?.(); watcher = null;
            activeUser = user;
            signingOut = false;
            engine.disconnect();
            onboarding.setUser(user);
            show(login, !user); show(logout, !!user);
            login.disabled = false;
            account.textContent = user ? `ログイン中：${user.email || user.displayName || 'Googleアカウント'}` : '未ログイン';
            if (!user) { migrating=false;explainTiming();status.textContent = 'Googleでログインすると、いまのデータを自動でクラウドへ引き継ぎます。'; return; }
            engine.connect(user.uid);
            try {
                if (!visits.has(user.uid)) visits.set(user.uid,beginSyncVisit(localStorage,user.uid));
                visit=visits.get(user.uid);
                const base=JSON.parse(localStorage.getItem(SYNC_META_KEY)||'null');
                migrating=base?.uid!==user.uid;
            } catch { visit=1; migrating=true; }
            explainTiming(); configureWatch();
            if (automatic()) void engine.sync();
            else defer();
        });
        explainTiming();
        onLocalSave(()=>{
            if(lastTiming!==timing()){lastTiming=timing();clearTimeout(timer);configureWatch();explainTiming();}
            if(automatic())schedule();else defer();
        });
        document.addEventListener('focusout', schedule);
        window.addEventListener('online', schedule);
        document.addEventListener('visibilitychange',()=>{if(!document.hidden&&['error','waiting'].includes(lastState))schedule();});
        setInterval(()=>{if(['error','waiting'].includes(lastState))schedule();},60000);
        window.addEventListener('offline', () => {
            if (activeUser) status.textContent = 'オフラインです。変更を端末に保存し、再接続後に同期します。';
        });
        // Another tab's snapshot is never silently uploaded from this tab's
        // stale in-memory config. Refresh the UI from the shared stored state.
        window.addEventListener('storage', event => {
            if (event.key !== STORAGE_KEY || !event.newValue) return;
            try {
                // Keep the previous tab state recoverable before refreshing editors.
                localStorage.setItem(SYNC_RECOVERY_KEY, JSON.stringify(selectSyncData(userConfig)));
                refreshUI(JSON.parse(event.newValue)); configureWatch();explainTiming();if(automatic())schedule();else defer();
            }
            catch { status.textContent = '別タブのデータを反映できません。再読み込みしてください。'; }
        });
    } catch {
        status.textContent = '同期機能を読み込めませんでした。接続を確認してページを再読み込みしてください。端末への保存は利用できます。';
        return;
    }
    login.addEventListener('click', async () => {
        if (login.disabled) return;
        login.disabled = true;
        onboarding.setBusy(true);
        let loginError = '';
        try { await adapter.signIn(); }
        catch (error) {
            const messages = {
                'auth/popup-closed-by-user':'ログインをキャンセルしました。',
                'auth/popup-blocked':'ログイン用のポップアップを許可して、もう一度お試しください。',
                'auth/unauthorized-domain':'この公開先ではログインが許可されていません。サイト管理者にお問い合わせください。'
            };
            loginError = messages[error.code] || 'Googleログインに失敗しました。接続を確認して、もう一度お試しください。';
            status.textContent = loginError;
        } finally { login.disabled = false; onboarding.setBusy(false); if(loginError)onboarding.showError(loginError); }
    });
    logout.addEventListener('click', async () => {
        signingOut = true;
        onboarding.snooze();
        clearTimeout(timer);
        watcher?.(); watcher = null;
        engine.disconnect(); // Invalidate in-flight reads and transaction retries immediately.
        try { await adapter.signOut(); }
        catch {
            signingOut = false;
            status.textContent = 'ログアウトできませんでした。再試行するかページを再読み込みしてください。同期は停止しています。';
        }
    });
    retry.addEventListener('click', () => void engine.sync());
    useLocal.addEventListener('click', () => {
        if (window.confirm('この端末の設定・ブックマーク・タスク・メモをクラウドに保存します。クラウドの既存データは置き換わります。続けますか？')) void engine.sync('local');
    });
    useCloud.addEventListener('click', () => {
        if (window.confirm('この端末の内容をクラウドのデータで置き換えます。置き換え前の内容は復旧用に端末内に保存します。続けますか？')) void engine.sync('cloud');
    });
    recovery.addEventListener('click', () => {
        try {
            const previous = JSON.parse(localStorage.getItem(SYNC_RECOVERY_KEY) || 'null');
            if (!previous) throw new Error('missing');
            const url = URL.createObjectURL(new Blob([createBackup(previous)], {type:'application/json'}));
            const link = document.createElement('a');
            link.href = url; link.download = 'LifeTop-before-cloud-sync.json';
            document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { status.textContent = '復旧用のバックアップを保存できませんでした。'; }
    });
}
