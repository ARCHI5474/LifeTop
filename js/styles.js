/* LifeTop - visual style application */
import { bgGradients, colorCombos, bgPresets, userConfig } from "./config.js?v=4.0-final";

export function applyStyles() {
    const root = document.documentElement;
    document.documentElement.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        document.documentElement.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        const lighter = ensureBrightAccent(adjustColor(rgb, 48));
        const darker = adjustColor(rgb, -36);
        document.documentElement.style.setProperty('--p-strong', rgbToHex(lighter));
        document.documentElement.style.setProperty('--p-deep', rgbToHex(darker));
        document.documentElement.style.setProperty('--p-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
        document.documentElement.style.setProperty('--p-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.32)`);
        document.documentElement.style.setProperty('--glass-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`);
    }
    document.documentElement.style.setProperty('--clock-f', userConfig.fontFamily);

    const paletteColor = bgGradients[userConfig.bgType] || bgGradients['gradient-blue'];
    root.style.setProperty('--text-color', '#f0f6ff');
    root.style.setProperty('--text-secondary', 'rgba(226, 238, 255, 0.74)');
    root.style.setProperty('--glass-bg', 'rgba(14, 24, 44, 0.62)');
    root.style.setProperty('--input-bg', 'rgba(7, 14, 28, 0.46)');
    root.style.setProperty('--control-bg', 'rgba(15, 26, 46, 0.48)');
    root.style.setProperty('--control-border', 'rgba(216, 232, 255, 0.14)');
    root.style.setProperty('--panel-bg', 'rgba(12, 21, 39, 0.88)');
    root.style.setProperty('--panel-border', 'rgba(216, 232, 255, 0.16)');
    root.style.setProperty('--glass-shadow', '0 22px 54px rgba(3, 9, 20, 0.28)');
    root.style.setProperty('--clock-c', '#ffffff');
    const background = userConfig.bgImage
        ? `url("${userConfig.bgImage.replace(/["\\]/g, '\\$&')}") center / cover no-repeat, ${paletteColor}`
        : paletteColor;
    root.style.setProperty('--bg-gradient', background);
    document.documentElement.style.setProperty('--bg-size', 'cover');
    const hasBgImage = Boolean(userConfig.bgImage);
    document.getElementById('bg-overlay')?.classList.toggle('has-background-image', hasBgImage);
    document.body?.classList?.toggle('has-background-image', hasBgImage);
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

function ensureBrightAccent(rgb) {
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    if (luminance >= 145) return rgb;
    const boost = Math.ceil((145 - luminance) * 0.85);
    return adjustColor(rgb, boost);
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
        return `<button type="button" class="color-combo ${activeClass}" aria-pressed="${Boolean(activeClass)}" onclick="setColorCombo(${index}, this)">
            <span class="color-combo-swatch" style="background:${background};"><span style="background:${combo.theme};"></span></span>
            <span class="color-combo-name">${combo.name}</span>
        </button>`;
    }).join('');
}

export function renderBgPresets() {
    const container = document.getElementById('bg-presets');
    if (!container) return;

    container.innerHTML = bgPresets.map((preset, index) => {
        const isActive = userConfig.bgImage === preset.url;
        const activeClass = isActive ? 'active' : '';
        const fallbackBg = bgGradients[preset.bgType] || '#182238';
        return `<button type="button" class="bg-preset-card ${activeClass}" aria-pressed="${isActive}" onclick="setPresetWallpaper(${index}, this)">
            <span class="bg-preset-thumb" style="background-color:${fallbackBg}; background-image:url('${preset.thumb}');">
                <span class="bg-preset-accent" style="background:${preset.theme};" aria-hidden="true"></span>
                <span class="bg-preset-check material-symbols-outlined" aria-hidden="true">check</span>
            </span>
            <span class="bg-preset-name">${preset.name}</span>
        </button>`;
    }).join('');

    const clearBtn = document.getElementById('background-image-clear');
    if (clearBtn) {
        clearBtn.disabled = !userConfig.bgImage;
    }
}
