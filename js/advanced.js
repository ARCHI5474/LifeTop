import { userConfig } from './config.js?v=8.0';
import { save } from './storage.js?v=8.0';
import { updateClock } from './clock.js?v=8.0';

const engines = {
    google: ['Google', 'https://www.google.com/search', 'q'],
    bing: ['Bing', 'https://www.bing.com/search', 'q'],
    duckduckgo: ['DuckDuckGo', 'https://duckduckgo.com/', 'q'],
    yahoo: ['Yahoo! JAPAN', 'https://search.yahoo.co.jp/search', 'p']
};
const defaults = { hideClockBackground: false, clockShowSec: false, reduceMotion: false, searchShape: 'pill', searchEngine: 'google', textSize: 'standard', highContrast: false, compactLayout: false, showNews: true, showYoutube: true };

export function applyAdvancedSettings() {
    const root = document.documentElement;
    root.style.setProperty('--search-radius', { pill: '999px', rounded: '16px', square: '0px' }[userConfig.searchShape]);
    root.classList.toggle('reduce-motion', userConfig.reduceMotion);
    root.classList.toggle('hide-clock-background', userConfig.hideClockBackground);
    root.dataset.textSize = userConfig.textSize;
    root.classList.toggle('high-contrast', userConfig.highContrast);
    root.classList.toggle('compact-layout', userConfig.compactLayout);
    for (const [key, selector] of [['showNews', '.news-card'], ['showYoutube', '.youtube-card']]) {
        const card = document.querySelector(selector);
        if (card) card.hidden = !userConfig[key];
    }
    for (const key of ['textSize', 'highContrast', 'compactLayout', 'showNews', 'showYoutube']) {
        const control = document.getElementById('advanced-' + key);
        if (control) {
            if (control.type === 'checkbox') control.checked = userConfig[key];
            else control.value = userConfig[key];
        }
    }
    for (const key of ['hideClockBackground', 'searchShape', 'reduceMotion', 'searchEngine']) {
        const control = document.getElementById('advanced-' + key);
        if (!control) continue;
        if (control.type === 'checkbox') control.checked = userConfig[key];
        else control.querySelectorAll('input[type="radio"]').forEach(option => {
            option.checked = option.value === userConfig[key];
        });
    }
    const seconds = document.getElementById('clock-show-sec-toggle');
    if (seconds) seconds.checked = userConfig.clockShowSec;
    const secondsDisplay = document.getElementById('clock-sec');
    if (secondsDisplay) secondsDisplay.style.display = userConfig.clockShowSec ? 'block' : 'none';
    const [name, url, param] = engines[userConfig.searchEngine] || engines.google;
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    if (form && input) {
        form.action = url;
        input.name = param;
        input.placeholder = name + 'で検索';
        form.querySelector('.search-button')?.setAttribute('aria-label', name + 'で検索');
    }
}

export function setAdvancedSetting(key, value) {
    if (key === 'textSize') {
        if (!['standard', 'large', 'larger'].includes(value)) return;
    } else if (key === 'searchShape') {
        if (!['pill', 'rounded', 'square'].includes(value)) return;
    } else if (key === 'searchEngine') {
        if (!Object.hasOwn(engines, value)) return;
    } else if (['reduceMotion', 'hideClockBackground', 'highContrast', 'compactLayout', 'showNews', 'showYoutube'].includes(key)) {
        value = Boolean(value);
    } else return;
    userConfig[key] = value;
    applyAdvancedSettings();
    save();
}

export function resetAdvancedSettings() {
    Object.assign(userConfig, defaults);
    applyAdvancedSettings();
    updateClock();
    if (save()) document.getElementById('advanced-reset-status').textContent = '高度な設定をデフォルトに戻しました。';
}
