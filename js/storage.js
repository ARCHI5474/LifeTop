/* LifeTop - data storage and initial UI state */
import {
    UPDATE_CONFIG,
    STORAGE_KEY,
    userConfig,
    mergeUserConfig
} from "./config.js?v=3.9.24";

export function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) {
        try {
            const parsed = JSON.parse(saved);
            mergeUserConfig(parsed);
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfig));
}
