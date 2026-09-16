/* LifeTop - visual style application */
import { bgGradients, userConfig } from "./config.js";

export function applyStyles() {
    document.documentElement.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        document.documentElement.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    document.documentElement.style.setProperty('--clock-f', userConfig.fontFamily);

    const gradient = bgGradients[userConfig.bgType] || bgGradients['gradient-blue'];
    const background = userConfig.bgImage
        ? `linear-gradient(rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.35)), url("${userConfig.bgImage.replace(/["\\\\]/g, '\\$&')}") center / cover no-repeat`
        : gradient;
    document.documentElement.style.setProperty('--bg-gradient', background);
    document.documentElement.style.setProperty('--bg-size', userConfig.bgImage ? 'cover' : '400% 400%');
    document.getElementById('bg-overlay')?.classList.toggle('has-background-image', Boolean(userConfig.bgImage));
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
export function renderBgSelector() {
    const container = document.getElementById('bg-selector-grid');
    if (!container) return;
    
    const html = Object.keys(bgGradients).map(key => {
        const activeClass = (!userConfig.bgImage && userConfig.bgType === key) ? 'active' : '';
        return `<div class="bg-option ${activeClass}" style="background: ${bgGradients[key]}" onclick="setBg('${key}', this)"></div>`;
    }).join('');

    container.innerHTML = html;
}
