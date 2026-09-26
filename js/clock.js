/* LifeTop - clock and greeting */
import { userConfig } from "./config.js?v=4.0-final";

// 挨拶と時計の更新
export function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    let ampm = "";
    if (userConfig.clock12h) {
        ampm = hours >= 12 ? " PM" : " AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
    }
    
    const hourStr = hours.toString().padStart(2, '0');
    document.getElementById('clock').innerText = `${hourStr}:${minutes}${ampm}`;
    document.getElementById('clock-sec').innerText = seconds;
    
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayName = days[now.getDay()];
    document.getElementById('date-display').innerText = `${year}年${month}月${date}日 (${dayName})`;
}

export function updateGreeting() {
    const now = new Date();
    const hours = now.getHours();
    let greetingText = "ようこそ";
    
    if (hours >= 4 && hours < 11) {
        greetingText = "今日も頑張りましょう";
    } else if (hours >= 11 && hours < 17) {
        greetingText = "リラックスしつつ過ごしましょう";
    } else {
        greetingText = "お疲れ様です";
    }
    
    const rawName = String(userConfig.username || "ゲスト").slice(0, 20).trim() || "ゲスト";
    const displayName = rawName.length > 12 ? `${rawName.slice(0, 12)}…` : rawName;
    document.getElementById('greeting').innerText = greetingText;
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.innerText = displayName;
}

