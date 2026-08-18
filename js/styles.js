/* LifeTop - visual style application */
import { bgGradients, unsplashImages, userConfig } from "./config.js";

// スタイルの適用
export function applyStyles() {
    document.documentElement.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        document.documentElement.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    document.documentElement.style.setProperty('--clock-f', userConfig.fontFamily);
    
    // 背景の適用
    const bgOverlay = document.getElementById('bg-overlay');
    if (userConfig.bgType === 'unsplash') {
        const day = new Date().getDate();
        const imgUrl = unsplashImages[day % unsplashImages.length];
        bgOverlay.style.background = `url('${imgUrl}')`;
        bgOverlay.style.backgroundSize = 'cover';
        bgOverlay.style.backgroundPosition = 'center';
    } else {
        const gradient = bgGradients[userConfig.bgType] || bgGradients['gradient-blue'];
        bgOverlay.style.background = gradient;
    }
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
// 背景デザイン選択ボタンの動的レンダリング
export function renderBgSelector() {
    const container = document.getElementById('bg-selector-grid');
    if (!container) return;
    
    let html = "";
    Object.keys(bgGradients).forEach(key => {
        const activeClass = (userConfig.bgType === key) ? 'active' : '';
        html += `<div class="bg-option ${activeClass}" style="background: ${bgGradients[key]}" onclick="setBg('${key}', this)"></div>`;
    });
    
    const unsplashActive = (userConfig.bgType === 'unsplash') ? 'active' : '';
    html += `
        <div class="bg-option bg-img-option ${unsplashActive}" id="unsplash-bg-btn" onclick="setBg('unsplash', this)">
            <span class="material-symbols-outlined">image</span>
        </div>
    `;
    
    container.innerHTML = html;
}

