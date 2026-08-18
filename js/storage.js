/* LifeTop - data storage and initial UI state */
import {
    UPDATE_CONFIG,
    STORAGE_KEY,
    userConfig,
    mergeUserConfig
} from "./config.js";

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
    
    // 日付変更検知による健康ログのリセット処理
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (userConfig.healthLog.lastUpdatedDate !== todayStr) {
        userConfig.healthLog.waterMl = 0;
        userConfig.healthLog.medications.forEach(m => m.taken = false);
        userConfig.healthLog.lastUpdatedDate = todayStr;
        save();
    }
    
    // UIへの値のセット
    document.getElementById('memo-area').value = userConfig.memo || "";
    document.getElementById('username-input').value = userConfig.username || "";
    document.getElementById('clock-12h-toggle').checked = userConfig.clock12h;
    document.getElementById('clock-show-sec-toggle').checked = userConfig.clockShowSec;
    
    // 管理者設定の反映
    document.getElementById('notice-text').innerText = UPDATE_CONFIG.notice;
    document.querySelector('.notice-tag').innerText = UPDATE_CONFIG.tag;
    
}

export function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfig));
}