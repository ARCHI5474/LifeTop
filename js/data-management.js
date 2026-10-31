import { userConfig, DEFAULT_SETTINGS, STORAGE_KEY, themes, colorCombos, fontStyles, bgGradients } from './config.js?v=8.0';
import { writeStoredConfig } from './storage.js?v=8.0';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function createBackup(config = userConfig) {
    return JSON.stringify({ format: 'lifetop-backup', version: 1, appVersion: '8.0', createdAt: new Date().toISOString(), data: config }, null, 2);
}

export function resetSettingsSnapshot(config = userConfig) {
    return { ...config, ...DEFAULT_SETTINGS };
}

export function parseBackup(text) {
    if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('バックアップは10MB以下のファイルを選んでください。');
    let backup;
    try {
        backup = JSON.parse(text, (key, value) => {
            if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('unsafe key');
            return value;
        });
    } catch { throw new Error('JSON形式のバックアップを読み込めませんでした。'); }
    if (!isObject(backup) || backup.format !== 'lifetop-backup' || backup.version !== 1 || !isObject(backup.data)) {
        throw new Error('対応するLifeTopバックアップではありません。');
    }
    const data = backup.data;
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (typeof data[key] !== typeof value) throw new Error('設定データが不足しているか、形式が正しくありません。');
    }
    const choices = {textSize:['standard','large','larger'],searchShape:['pill','rounded','square'],searchEngine:['google','bing','duckduckgo','yahoo'],colorMode:['dark']};
    if (Object.entries(choices).some(([key, values]) => !values.includes(data[key])) ||
        ![...themes, ...colorCombos.map(combo => combo.theme)].includes(data.theme) ||
        !fontStyles.some(font => font.family === data.fontFamily) || !Object.hasOwn(bgGradients, data.bgType)) {
        throw new Error('対応していない設定値が含まれています。');
    }
    if (typeof data.memo !== 'string' || typeof data.memoHtml !== 'string' || !Array.isArray(data.todoList) || !Array.isArray(data.bookmarks)) {
        throw new Error('メモ・タスク・ブックマークの形式が正しくありません。');
    }
    const ids = new Set();
    for (const todo of data.todoList) {
        if (!isObject(todo) || !Number.isSafeInteger(todo.id) || ids.has(todo.id) || typeof todo.text !== 'string' || typeof todo.completed !== 'boolean') {
            throw new Error('タスクの形式や識別番号が正しくありません。');
        }
        ids.add(todo.id);
    }
    const validLink = item => {
        if (!isObject(item) || typeof item.title !== 'string' || typeof item.url !== 'string') return false;
        try { return ['http:', 'https:'].includes(new URL(item.url).protocol); } catch { return false; }
    };
    const folders = new Set();
    for (const item of data.bookmarks) {
        if (item?.type === 'folder') {
            if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(item.id) || folders.has(item.id) || typeof item.title !== 'string' || !Array.isArray(item.children) || !item.children.every(validLink)) {
                throw new Error('ブックマークフォルダの形式が正しくありません。');
            }
            folders.add(item.id);
        } else if (!validLink(item)) throw new Error('ブックマークには有効なHTTP／HTTPSのURLが必要です。');
    }
    return data;
}

// One storage write: validation or quota failures leave the existing data intact.
export function storeSnapshot(config, storage) {
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(config));
    else writeStoredConfig(config);
}

export function initDataManagement() {
    const download = document.getElementById('backup-download');
    const upload = document.getElementById('backup-upload');
    const restore = document.getElementById('backup-restore');
    const cancel = document.getElementById('backup-cancel');
    const status = document.getElementById('data-management-status');
    const reset = document.getElementById('settings-reset-all');
    let pending = null;
    let selection = 0;
    const clear = () => {
        pending = null;
        restore.hidden = cancel.hidden = true;
        upload.value = '';
    };
    download.addEventListener('click', () => {
        try {
            const blob = new Blob([createBackup()], {type:'application/json'});
            if (blob.size > MAX_BACKUP_BYTES) throw new Error('データが10MBを超えているため、バックアップを作成できません。');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `LifeTop-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.append(link);
            link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = 'バックアップのダウンロードを開始しました。';
        } catch (error) { status.textContent = error.message; }
    });
    upload.addEventListener('change', async () => {
        const request = ++selection;
        const file = upload.files?.[0];
        clear();
        if (!file) return;
        try {
            if (file.size > MAX_BACKUP_BYTES) throw new Error('10MB以下のファイルを選んでください。');
            const text = await file.text();
            if (request !== selection) return;
            pending = parseBackup(text);
            status.textContent = `ブックマーク${pending.bookmarks.length}件・タスク${pending.todoList.length}件と、メモ・プロフィール・設定を復元します。現在の内容は置き換わります。必要なら先にバックアップを保存してください。`;
            restore.hidden = cancel.hidden = false;
        } catch (error) { if (request === selection) status.textContent = error.message; }
    });
    cancel.addEventListener('click', () => {
        selection++; clear(); status.textContent = '復元をキャンセルしました。';
    });
    restore.addEventListener('click', () => {
        if (!pending) return;
        try {
            storeSnapshot(pending);
            window.location.reload();
        } catch { status.textContent = '保存できませんでした。現在のデータは変更していません。ブラウザの保存設定や空き容量を確認してください。'; }
    });
    reset.addEventListener('click', () => {
        if (!window.confirm('プロフィール・外観・時計・表示設定をデフォルトに戻します。ブックマーク・タスク・メモは残ります。実行しますか？')) return;
        try {
            storeSnapshot(resetSettingsSnapshot());
            window.location.reload();
        } catch { status.textContent = '設定を保存できませんでした。現在の内容は変更していません。'; }
    });
}
