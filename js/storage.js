/* LifeTop - data storage and initial UI state */
import {
    UPDATE_CONFIG,
    STORAGE_KEY,
    userConfig,
    mergeUserConfig
} from "./config.js?v=4.0-final";

export function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            mergeUserConfig(parsed);
        }
    } catch (e) {
        console.error("Failed to load settings", e);
        showStorageStatus('保存データを読み込めませんでした。ブラウザの保存設定を確認してください。');
    }
    
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfig));
        showStorageStatus('');
        return true;
    } catch (error) {
        console.error('Failed to save settings', error);
        showStorageStatus('変更を保存できませんでした。保存容量やブラウザの設定を確認してください。');
        return false;
    }
}

function showStorageStatus(message) {
    const status = document.getElementById('storage-status');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
}
