// Framework-independent optimistic synchronization. No last-write-wins data loss.
export const SYNC_META_KEY = 'lifetop_sync_base_v1';
export const SYNC_RECOVERY_KEY = 'lifetop_sync_recovery_v1';
export const MAX_SYNC_BYTES = 900 * 1024;

export function canonicalJson(value) {
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
    return JSON.stringify(value);
}

export function checkedPayload(config) {
    const payload = canonicalJson(config);
    if (new TextEncoder().encode(payload).length > MAX_SYNC_BYTES) {
        const error = new Error('同期できるデータは900KBまでです。画像やメモを小さくするか、JSONバックアップで保存してください。端末のデータは残っています。');
        error.code = 'sync/too-large';
        throw error;
    }
    return payload;
}

export function createSyncEngine({ remote, storage, readLocal, applyCloud, validate, onState, canApplyCloud = () => true, autoMigrate = false, mergeInitialData }) {
    let uid = null;
    let generation = 0;
    let busy = false;
    let queued = false;
    let base = null;
    let choiceRequired = false;
    let otherAccount = false;
    const emit = (status, message) => onState({status, message, uid});
    const remember = (revision, payload) => {
        const next = {uid, revision, payload};
        storage.setItem(SYNC_META_KEY, JSON.stringify(next));
        base = next;
    };
    const validRemote = document => {
        if (!document) return null;
        if (document.schema !== 1 || !Number.isSafeInteger(document.revision) || document.revision < 1 || typeof document.payload !== 'string' || new TextEncoder().encode(document.payload).length > MAX_SYNC_BYTES) {
            throw new Error('クラウドのデータ形式に対応していません。端末のデータは変更していません。');
        }
        const data = validate(document.payload);
        return {...document, payload:checkedPayload(data), data};
    };
    const engine = {
        connect(accountId) {
            generation++;
            uid = accountId;
            base = null;
            queued = false;
            choiceRequired = false;
            otherAccount = false;
            try {
                const saved = JSON.parse(storage.getItem(SYNC_META_KEY) || 'null');
                otherAccount = !!saved?.uid && saved.uid !== uid;
                if (saved?.uid === uid && Number.isSafeInteger(saved.revision) && saved.revision >= 1 && typeof saved.payload === 'string') base = saved;
            } catch { /* Start with an explicit choice if the local baseline is unavailable. */ }
            emit('checking', 'クラウドのデータを確認しています…');
        },
        disconnect() {
            generation++;
            uid = null;
            base = null;
            choiceRequired = false;
            queued = false;
            emit('signed-out', 'ログアウトしました。端末内のデータは引き続き利用できます。');
        },
        async sync(mode = 'auto') {
            if (!uid) return;
            if (busy) { if (mode === 'auto') queued = true; return; }
            if (mode === 'auto' && choiceRequired) return;
            busy = true;
            const token = generation;
            const account = uid;
            const current = () => token === generation && account === uid;
            try {
                emit('syncing', '同期しています…');
                const local = checkedPayload(readLocal());
                const cloud = validRemote(await remote.read(account));
                if (!current()) return;
                // An edit while reading is handled by a fresh attempt, never discarded.
                if (checkedPayload(readLocal()) !== local) {
                    if (mode === 'auto') queued = true;
                    else {
                        choiceRequired = true;
                        emit('choice', '確認中に端末のデータが変更されました。残すデータをもう一度選んでください。');
                    }
                    return;
                }
                if (!base && mode === 'auto') {
                    if (autoMigrate && !otherAccount) {
                        const data = cloud ? mergeInitialData(JSON.parse(local), cloud.data) : JSON.parse(local);
                        const payload = checkedPayload(data);
                        if (!canApplyCloud()) { emit('waiting', 'ログインできました。入力を終えるとデータを自動移行します。'); return; }
                        storage.setItem(SYNC_RECOVERY_KEY, local);
                        const revision = cloud?.revision || 0;
                        if (payload !== cloud?.payload) await remote.write(account, revision, payload, current);
                        if (!current()) return;
                        // Preserve edits made during the upload; the next pass detects a conflict.
                        if (checkedPayload(readLocal()) !== local) {
                            remember(payload === cloud?.payload ? revision : revision+1, payload);
                            choiceRequired = true;
                            emit('conflict', '移行中に端末の内容が変わりました。両方のデータを残しているので、続ける内容を確認してください。');
                            return;
                        }
                        if (payload !== local) applyCloud(data);
                        remember(payload === cloud?.payload ? revision : revision+1, payload);
                        choiceRequired = false;
                        emit('synced', 'データの自動移行が完了しました。同期済み');
                        return;
                    }
                    choiceRequired = true;
                    emit(cloud ? 'choice' : 'first-upload', cloud ? 'クラウドにデータがあります。最初に使うデータを選んでください。' : '最初の同期です。この端末のデータをクラウドに保存できます。');
                    return;
                }
                if (cloud?.payload === local) {
                    remember(cloud.revision, local);
                    choiceRequired = false;
                    emit('synced', '同期済み');
                    return;
                }
                if (mode === 'cloud' || (mode === 'auto' && base && local === base.payload && cloud)) {
                    if (!cloud) throw new Error('クラウドにデータがありません。端末のデータは残っています。');
                    if (mode === 'auto' && !canApplyCloud()) {
                        emit('waiting', '別の端末の変更があります。入力を終えると反映します。');
                        return;
                    }
                    // Recovery must succeed before replacing local content.
                    storage.setItem(SYNC_RECOVERY_KEY, local);
                    applyCloud(cloud.data);
                    remember(cloud.revision, cloud.payload);
                    choiceRequired = false;
                    emit('synced', 'クラウドのデータを反映しました。同期済み');
                    return;
                }
                if (mode === 'auto' && (!cloud || cloud.payload !== base?.payload)) {
                    choiceRequired = true;
                    emit('conflict', '別の端末でも変更されています。自動同期を停止しました。バックアップを保存してから残すデータを選んでください。');
                    return;
                }
                // Even an explicit choice uses compare-and-swap. A change made
                // after this read cannot be overwritten by the transaction.
                const revision = cloud?.revision || 0;
                await remote.write(account, revision, local, current);
                if (!current()) return;
                remember(revision + 1, local);
                choiceRequired = false;
                emit('synced', '同期済み');
                if (checkedPayload(readLocal()) !== local) queued = true;
            } catch (error) {
                if (!current()) return;
                if (error.code === 'sync/conflict') {
                    choiceRequired = true;
                    emit('conflict', '同期中に別の端末が更新しました。残すデータをもう一度選んでください。');
                } else {
                    emit('error', error.code === 'sync/too-large' ? error.message : '同期できませんでした。端末の変更は残っています。接続と同期設定を確認して再試行してください。');
                }
            } finally {
                busy = false;
                if (queued) { queued = false; void engine.sync(); }
            }
        }
    };
    return engine;
}
