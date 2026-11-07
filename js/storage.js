/* LifeTop - data storage and initial UI state */
import {
    UPDATE_CONFIG,
    STORAGE_KEY,
    userConfig,
    mergeUserConfig
} from "./config.js?v=9.0";

const saveListeners = new Set();
const snapshot = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
let configBaseline = snapshot(userConfig);
let storedBaseline = {};
let storageReadable = true;
export function acceptStoredConfig(config) {
    if (!isRecord(config)) throw Error('保存データの形式が不正です。');
    configBaseline = snapshot(userConfig);
    storedBaseline = snapshot(config);
    storageReadable = true;
}
export function onLocalSave(listener) {
    saveListeners.add(listener);
    return () => saveListeners.delete(listener);
}

export function writeStoredConfig(config, notify = true) {
    if (!isRecord(config)) throw Error('保存データの形式が不正です。');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Do not adopt values that this tab's editors have never received.
    for (const key of new Set([...Object.keys(storedBaseline), ...Object.keys(config)])) {
        if (!sameValue(userConfig[key], config[key])) continue;
        if (Object.hasOwn(config, key)) storedBaseline[key] = snapshot(config[key]);
        else delete storedBaseline[key];
    }
    configBaseline = snapshot(userConfig);
    if (notify) saveListeners.forEach(listener => {
        try { listener(); } catch (error) { console.error('Sync notification failed', error); }
    });
}

export function loadData() {
    let readSucceeded = false;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        readSucceeded = true;
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!isRecord(parsed)) throw Error('保存データの形式が不正です。');
            mergeUserConfig(parsed);
            storedBaseline = snapshot(parsed);
        } else {
            storedBaseline = {};
        }
        storageReadable = true;
    } catch (e) {
        storageReadable = readSucceeded;
        console.error("Failed to load settings", e);
        showStorageStatus('保存データを読み込めませんでした。ブラウザの保存設定を確認してください。');
    }
    configBaseline = snapshot(userConfig);
    
    document.getElementById('memo-area').value = userConfig.memo || "";
    document.getElementById('username-input').value = userConfig.username || "";
    document.getElementById('clock-12h-toggle').checked = userConfig.clock12h;
    document.getElementById('clock-show-sec-toggle').checked = userConfig.clockShowSec;
    const secEl = document.getElementById('clock-sec');
    if (secEl) {
        secEl.style.display = userConfig.clockShowSec ? 'block' : 'none';
    }
    document.getElementById('notice-text').innerText = UPDATE_CONFIG.notice;
    document.querySelector('.notice-tag').innerText = UPDATE_CONFIG.tag;
}

export function save() {
    try {
        let latest;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            latest = raw ? JSON.parse(raw) : {};
            if (!isRecord(latest)) throw Error('保存データの形式が不正です。');
        } catch (error) {
            if (storageReadable) throw error;
            latest = snapshot(userConfig);
        }
        const changed = new Set([...Object.keys(configBaseline), ...Object.keys(userConfig)]
            .filter(key => !sameValue(userConfig[key], configBaseline[key])));
        if (changed.has('memo') || changed.has('memoHtml')) {
            changed.add('memo');
            changed.add('memoHtml');
        }
        for (const key of changed) {
            if (!sameValue(latest[key], storedBaseline[key]) && !sameValue(latest[key], userConfig[key])) {
                const error = Error('別のタブで同じ項目が更新されました。変更を上書きしていません。内容を控えて再読み込みしてください。');
                error.code = 'storage/conflict';
                throw error;
            }
            if (Object.hasOwn(userConfig, key)) latest[key] = userConfig[key];
            else delete latest[key];
        }
        for (const key of Object.keys(userConfig)) {
            if (!Object.hasOwn(latest, key) && !Object.hasOwn(storedBaseline, key)) latest[key] = userConfig[key];
        }
        writeStoredConfig(latest);
        showStorageStatus('');
        return true;
    } catch (error) {
        console.error('Failed to save settings', error);
        showStorageStatus(error.code === 'storage/conflict' ? error.message : '変更を保存できませんでした。保存容量やブラウザの設定を確認してください。');
        return false;
    }
}

function showStorageStatus(message) {
    const status = document.getElementById('storage-status');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
}
