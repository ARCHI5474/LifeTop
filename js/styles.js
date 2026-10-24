/* LifeTop - visual style application */
import { bgGradients, bgGradientsLight, colorCombos, bgPresets, userConfig } from "./config.js?v=4.0-final";

export function applyStyles() {
    const root = document.documentElement;
    const isLight = userConfig.colorMode === 'light';
    if (root.dataset) {
        root.dataset.colorMode = isLight ? 'light' : 'dark';
    }
    document.body?.classList?.toggle('light-mode', isLight);

    root.style.setProperty('--p', userConfig.theme);
    const rgb = hexToRgb(userConfig.theme);
    if (rgb) {
        root.style.setProperty('--p-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        const strongColor = isLight
            ? ensureReadableLightAccent(adjustColor(rgb, -20))
            : ensureBrightAccent(adjustColor(rgb, 48));
        const darker = adjustColor(rgb, -36);
        root.style.setProperty('--p-strong', rgbToHex(strongColor));
        root.style.setProperty('--p-deep', rgbToHex(darker));
        root.style.setProperty('--p-soft', isLight ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)` : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
        root.style.setProperty('--p-glow', isLight ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)` : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.32)`);
        root.style.setProperty('--glass-border', isLight ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.26)` : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`);
    }
    root.style.setProperty('--clock-f', userConfig.fontFamily);

    const darkPalette = bgGradients[userConfig.bgType] || bgGradients['gradient-blue'];
    const lightPalette = bgGradientsLight[userConfig.bgType] || bgGradientsLight['gradient-blue'];
    const paletteColor = isLight ? lightPalette : darkPalette;

    if (isLight) {
        root.style.setProperty('--text-color', '#0f1d33');
        root.style.setProperty('--text-secondary', 'rgba(20, 39, 68, 0.78)');
        root.style.setProperty('--text-muted', 'rgba(36, 59, 94, 0.64)');
        root.style.setProperty('--surface-raised', 'rgba(255, 255, 255, 0.80)');
        root.style.setProperty('--surface-card-hover', 'rgba(255, 255, 255, 0.90)');
        root.style.setProperty('--surface-soft', 'rgba(15, 29, 51, 0.045)');
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.75)');
        root.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.86)');
        root.style.setProperty('--control-bg', 'rgba(255, 255, 255, 0.78)');
        root.style.setProperty('--control-border', 'rgba(15, 29, 51, 0.13)');
        root.style.setProperty('--line-soft', 'rgba(15, 29, 51, 0.11)');
        root.style.setProperty('--panel-bg', 'rgba(248, 251, 255, 0.95)');
        root.style.setProperty('--panel-border', 'rgba(15, 29, 51, 0.14)');
        root.style.setProperty('--glass-shadow', '0 18px 44px rgba(15, 32, 62, 0.10)');
        root.style.setProperty('--dialog-shadow', '0 24px 60px rgba(15, 32, 62, 0.18)');
        root.style.setProperty('--inner-highlight', 'inset 0 1px 0 rgba(255, 255, 255, 0.85)');
        root.style.setProperty('--clock-c', '#0d1b30');
    } else {
        root.style.setProperty('--text-color', '#f0f6ff');
        root.style.setProperty('--text-secondary', 'rgba(226, 238, 255, 0.74)');
        root.style.setProperty('--text-muted', 'rgba(214, 228, 248, 0.62)');
        root.style.setProperty('--surface-raised', 'rgba(16, 28, 50, 0.72)');
        root.style.setProperty('--surface-card-hover', 'rgba(19, 33, 58, 0.76)');
        root.style.setProperty('--surface-soft', 'rgba(255, 255, 255, 0.045)');
        root.style.setProperty('--glass-bg', 'rgba(14, 24, 44, 0.62)');
        root.style.setProperty('--input-bg', 'rgba(7, 14, 28, 0.46)');
        root.style.setProperty('--control-bg', 'rgba(15, 26, 46, 0.48)');
        root.style.setProperty('--control-border', 'rgba(216, 232, 255, 0.14)');
        root.style.setProperty('--line-soft', 'rgba(220, 235, 255, 0.12)');
        root.style.setProperty('--panel-bg', 'rgba(12, 21, 39, 0.88)');
        root.style.setProperty('--panel-border', 'rgba(216, 232, 255, 0.16)');
        root.style.setProperty('--glass-shadow', '0 22px 54px rgba(3, 9, 20, 0.28)');
        root.style.setProperty('--dialog-shadow', '0 28px 72px rgba(2, 8, 18, 0.45)');
        root.style.setProperty('--inner-highlight', 'inset 0 1px 0 rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--clock-c', '#ffffff');
    }

    const background = userConfig.bgImage
        ? `url("${userConfig.bgImage.replace(/["\\]/g, '\\$&')}") center / cover no-repeat, ${darkPalette}`
        : paletteColor;
    root.style.setProperty('--bg-gradient', background);
    root.style.setProperty('--bg-size', 'cover');
    const hasBgImage = Boolean(userConfig.bgImage);
    document.getElementById('bg-overlay')?.classList.toggle('has-background-image', hasBgImage);
    document.body?.classList?.toggle('has-background-image', hasBgImage);
    syncColorModeUI(isLight);
}

export function syncColorModeUI(isLight = userConfig.colorMode === 'light') {
    const headerBtn = document.getElementById('theme-mode-btn');
    const headerIcon = document.getElementById('theme-mode-icon');
    if (headerBtn) {
        const label = isLight ? 'ダークモードに切り替え' : 'ライトモードに切り替え';
        headerBtn.title = label;
        headerBtn.setAttribute?.('aria-label', label);
        headerBtn.setAttribute?.('aria-pressed', String(isLight));
    }
    if (headerIcon) {
        headerIcon.textContent = isLight ? 'dark_mode' : 'light_mode';
    }
    document.querySelectorAll?.('[data-color-mode-btn]').forEach(btn => {
        const active = btn.dataset.colorModeBtn === (isLight ? 'light' : 'dark');
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-pressed', String(active));
    });
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

function ensureReadableLightAccent(rgb) {
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    if (luminance <= 125) return rgb;
    const darken = -Math.ceil((luminance - 115) * 0.85);
    return adjustColor(rgb, darken);
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
