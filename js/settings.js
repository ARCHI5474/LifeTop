/* LifeTop - settings panel controls */
import { themes, fontStyles, userConfig } from "./config.js";
import { applyStyles, renderBgSelector } from "./styles.js";
import { save } from "./storage.js";
import { updateClock, updateGreeting } from "./clock.js";
// ピッカーの初期化
export function initPickers() {
    // アクセントカラーピッカー
    const colorsContainer = document.getElementById('theme-colors');
    colorsContainer.innerHTML = themes.map(c => {
        const activeClass = (c.toLowerCase() === userConfig.theme.toLowerCase()) ? 'active' : '';
        return `<div class="color-dot ${activeClass}" style="background:${c}" onclick="setTheme('${c}', this)"></div>`;
    }).join('');

    // フォントピッカー
    const fontsContainer = document.getElementById('font-styles');
    fontsContainer.innerHTML = fontStyles.map(f => {
        const activeClass = (f.family === userConfig.fontFamily) ? 'active' : '';
  return `<button class="font-btn ${activeClass}" style="font-family:${f.family}" onclick="setFontFamily(${JSON.stringify(f.family).replace(/"/g, '&quot;')}, this)">${f.name}</button>`;
    }).join('');
}

// 設定変更
export function setTheme(c, element) {
    userConfig.theme = c;
    applyStyles();
    save();
    
    document.querySelectorAll('#theme-colors .color-dot').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
}

export function setFontFamily(f, element) {
    userConfig.fontFamily = f;
    applyStyles();
    save();
    
    document.querySelectorAll('#font-styles .font-btn').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
}

export function saveUsername(val) {
    userConfig.username = val || "ゲスト";
    save();
    updateGreeting();
}

export function toggleClock12h(checked) {
    userConfig.clock12h = checked;
    save();
    updateClock();
}

export function toggleClockSec(checked) {
    userConfig.clockShowSec = checked;
    save();
    
    const secEl = document.getElementById('clock-sec');
    secEl.style.display = checked ? 'block' : 'none';
    updateClock();
}

// 背景の選択
export function setBg(type, element) {
    userConfig.bgType = type;
    applyStyles();
    save();
    
    document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        renderBgSelector();
    }
}

// 設定パネルトグル
export function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('active');
}
