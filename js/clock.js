/* LifeTop - clock and greeting */
import { userConfig } from "./config.js?v=9.0";

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
    const clock = document.getElementById('clock');
    const hourPart = clock.querySelector('.clock-hours');
    const minutePart = clock.querySelector('.clock-minutes');
    // Keep digit nodes stable so each tick does not recreate the clock face.
    if (hourPart && minutePart) {
        if (hourPart.textContent !== hourStr) hourPart.textContent = hourStr;
        if (minutePart.textContent !== minutes) minutePart.textContent = minutes;
    } else clock.innerText = `${hourStr}:${minutes}${ampm}`;
    const label=`${hourStr}:${minutes}${userConfig.clockShowSec?':'+seconds:''}${ampm}`;
    if(clock.getAttribute('aria-label')!==label)clock.setAttribute('aria-label',label);
    const secondPart = document.getElementById('clock-sec');
    if (secondPart.textContent !== seconds) secondPart.textContent = seconds;
    const period = document.getElementById('clock-period');
    if (period && period.textContent !== (ampm.trim() || '24H')) period.textContent = ampm.trim() || '24H';
    const progress = document.getElementById('clock-day-progress');
    if (progress) progress.style.width = `${((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) * 100}%`;
    
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayName = days[now.getDay()];
    const dateLabel=`${year}年${month}月${date}日 (${dayName})`;
    const dateDisplay=document.getElementById('date-display');
    if(dateDisplay.textContent!==dateLabel)dateDisplay.textContent=dateLabel;
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
    const greeting=document.getElementById('greeting');
    if(greeting.textContent!==greetingText)greeting.textContent=greetingText;
    const headerName = document.getElementById('header-user-name');
    if (headerName && headerName.textContent!==displayName) headerName.textContent = displayName;
}

