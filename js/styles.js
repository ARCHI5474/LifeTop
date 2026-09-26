/* LifeTop - visual style application */
import { bgGradients, colorCombos, userConfig } from "./config.js?v=4.0-final";

export function applyStyles() {
    const root = document.documentElement;
    document.documentElement.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        document.documentElement.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        const lighter = adjustColor(rgb, 34);
        const darker = adjustColor(rgb, -38);
        document.documentElement.style.setProperty('--p-strong', rgbToHex(lighter));
        document.documentElement.style.setProperty('--p-deep', rgbToHex(darker));
        document.documentElement.style.setProperty('--p-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
        document.documentElement.style.setProperty('--glass-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
    }
    document.documentElement.style.setProperty('--clock-f', userConfig.fontFamily);

    const paletteColor = bgGradients[userConfig.bgType] || bgGradients['gradient-blue'];
    const backgroundRgb = hexToRgb(paletteColor) || { r: 39, g: 67, b: 74 };
    root.style.setProperty('--text-color', '#edf6ff');
    root.style.setProperty('--text-secondary', 'rgba(237, 246, 255, 0.74)');
    root.style.setProperty('--glass-bg', 'rgba(15, 23, 42, 0.46)');
    root.style.setProperty('--input-bg', 'rgba(15, 23, 42, 0.38)');
    root.style.setProperty('--control-bg', 'rgba(15, 23, 42, 0.38)');
    root.style.setProperty('--control-border', 'rgba(148, 163, 184, 0.24)');
    root.style.setProperty('--panel-bg', 'rgba(15, 23, 42, 0.88)');
    root.style.setProperty('--panel-border', 'rgba(148, 163, 184, 0.18)');
    root.style.setProperty('--glass-shadow', '0 18px 45px rgba(15, 23, 42, 0.26)');
    root.style.setProperty('--clock-c', '#ffffff');
    const background = userConfig.bgImage
        ? `url("${userConfig.bgImage.replace(/["\\]/g, '\\$&')}") center / cover no-repeat`
        : paletteColor;
    root.style.setProperty('--bg-gradient', background);
    document.documentElement.style.setProperty('--bg-size', 'cover');
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

function adjustColor(rgb, amount) {
    return {
        r: Math.min(255, Math.max(0, rgb.r + amount)),
        g: Math.min(255, Math.max(0, rgb.g + amount)),
        b: Math.min(255, Math.max(0, rgb.b + amount))
    };
}

function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
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

export function renderColorCombos() {
    const container = document.getElementById('color-combos');
    if (!container) return;

    container.innerHTML = colorCombos.map((combo, index) => {
        const activeClass = !userConfig.bgImage && userConfig.bgType === combo.bgType && userConfig.theme.toLowerCase() === combo.theme.toLowerCase()
            ? 'active'
            : '';
        const background = bgGradients[combo.bgType];
        return `<button type="button" class="color-combo ${activeClass}" onclick="setColorCombo(${index}, this)">
            <span class="color-combo-swatch" style="background:${background};"><span style="background:${combo.theme};"></span></span>
            <span class="color-combo-name">${combo.name}</span>
        </button>`;
    }).join('');
}
