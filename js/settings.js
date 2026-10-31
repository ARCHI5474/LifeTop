/* LifeTop - settings panel controls */
import { colorCombos, bgPresets, fontStyles, userConfig } from "./config.js?v=8.0";
import { applyStyles, renderColorCombos, renderBgPresets, renderBgSelector } from "./styles.js?v=8.0";
import { save } from "./storage.js?v=8.0";
import { updateClock, updateGreeting } from "./clock.js?v=8.0";

let settingsTrigger;
let helpTrigger;

export function toggleHelp() {
    const modal = document.getElementById('help-modal') || document.getElementById('game-modal');
    const overlay = document.getElementById('help-overlay') || document.getElementById('game-overlay');
    if (!modal) return;
    const isOpen = modal.classList.toggle('active');
    modal.inert = !isOpen;
    overlay?.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
        helpTrigger = document.activeElement;
        modal.querySelector('button')?.focus();
    } else {
        helpTrigger?.focus();
    }
}

function bindDialogFocusTrap(dialogEl) {
    if (!dialogEl) return;
    dialogEl.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button, input, select, textarea, summary, a[href]')]
            .filter(control => !control.disabled && control.getClientRects().length && control.tabIndex >= 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    });
}

// ピッカーの初期化
export function initPickers() {
    initSettingsCategories();
    renderColorCombos();
    renderBgPresets();
    ['settings-panel', 'game-modal', 'help-modal', 'weather-detail-modal', 'bookmark-dialog'].forEach(id => {
        bindDialogFocusTrap(document.getElementById(id));
    });

    const fontsContainer = document.getElementById('font-styles');
    fontsContainer.innerHTML = fontStyles.map(f => {
        const activeClass = (f.family === userConfig.fontFamily) ? 'active' : '';
        return `<button class="font-btn ${activeClass}" style="font-family:${f.family}" onclick="setFontFamily(${JSON.stringify(f.family).replace(/"/g, '&quot;')}, this)">${f.name}</button>`;
    }).join('');

    const imageUrlInput = document.getElementById('background-image-url');
    const imageUpload = document.getElementById('background-image-upload');
    const applyImageUrl = document.getElementById('background-image-url-apply');
    const clearImage = document.getElementById('background-image-clear');
    if (!imageUrlInput || !imageUpload || !applyImageUrl || !clearImage) return;

    const isPresetImage = bgPresets.some(preset => preset.url === userConfig.bgImage);
    imageUrlInput.value = userConfig.bgImage.startsWith('https://') && !isPresetImage ? userConfig.bgImage : '';
    applyImageUrl.onclick = () => setBackgroundImageUrl(imageUrlInput.value);
    imageUrlInput.onkeydown = event => {
        if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            setBackgroundImageUrl(imageUrlInput.value);
        }
    };
    imageUpload.onchange = event => setBackgroundImageFile(event.target.files?.[0]);
    clearImage.onclick = clearBackgroundImage;
}

function initSettingsCategories() {
    const body = document.querySelector('.settings-body');
    if (!body || body.querySelector('.settings-category-tabs')) return;
    const sections = [...body.querySelectorAll(':scope > .settings-section, :scope > .settings-about')];
    const tabs = document.createElement('div');
    tabs.className = 'settings-category-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '設定カテゴリ');
    const labels = { profile: 'プロフィール', appearance: '外観', clock: '時計', advanced: '詳細' };
    const panels = Object.keys(labels).map(category => {
        const panel = document.createElement('div');
        panel.id = `settings-category-${category}`;
        panel.className = 'settings-category-panel';
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `settings-tab-${category}`);
        sections.forEach(section => {
            if (section.dataset.settingCategory === category) panel.append(section);
        });
        body.append(panel);
        return panel;
    });
    tabs.innerHTML = Object.entries(labels).map(([key, label]) =>
        `<button type="button" id="settings-tab-${key}" role="tab" aria-controls="settings-category-${key}">${label}</button>`).join('');
    const buttons = [...tabs.children];
    const select = index => {
        const changed = !buttons[index].classList.contains('active');
        buttons.forEach((button, i) => {
            button.classList.toggle('active', i === index);
            button.setAttribute('aria-selected', String(i === index));
            button.tabIndex = i === index ? 0 : -1;
            panels[i].hidden = i !== index;
        });
        if (changed) body.scrollTop = 0;
    };
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => select(index));
        button.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
            else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = buttons.length - 1;
            else return;
            event.preventDefault();
            select(next);
            buttons[next].focus();
        });
    });
    body.insertBefore(tabs, panels[0]);
    const display = document.createElement('section');
    display.className = 'settings-section';
    display.innerHTML = `<h3 class="settings-label">見やすさと表示</h3>
        <label for="advanced-textSize">文字サイズ</label>
        <select id="advanced-textSize" class="settings-input" onchange="setAdvancedSetting('textSize',this.value)"><option value="standard">標準</option><option value="large">大きめ</option><option value="larger">さらに大きく</option></select>
        ${[['highContrast','コントラストを強める'],['compactLayout','余白をコンパクトにする'],['showNews','ニュースを表示'],['showYoutube','YouTubeを表示']].map(([key,label]) => `<div class="toggle-wrapper"><label for="advanced-${key}">${label}</label><label class="switch"><input type="checkbox" role="switch" id="advanced-${key}" onchange="setAdvancedSetting('${key}',this.checked)"><span class="slider" aria-hidden="true"></span></label></div>`).join('')}
        <p class="settings-help">変更は自動保存されます。「詳細」のデフォルトに戻す操作で、この表示設定もリセットできます。</p>`;
    panels[1].append(display);
    select(0);
}

export function setColorCombo(index) {
    const combo = colorCombos[index];
    if (!combo) return;
    userConfig.bgType = combo.bgType;
    userConfig.theme = combo.theme;
    userConfig.bgImage = '';
    applyStyles();
    save();
    renderColorCombos();
    renderBgPresets();
    document.getElementById('background-image-url').value = '';
    document.getElementById('background-image-upload').value = '';
}

export function setPresetWallpaper(index) {
    const preset = bgPresets[index];
    if (!preset) return;
    userConfig.bgType = preset.bgType;
    userConfig.theme = preset.theme;
    userConfig.bgImage = preset.url;
    applyStyles();
    save();
    renderColorCombos();
    renderBgPresets();
    renderBgSelector();
    const urlInput = document.getElementById('background-image-url');
    const uploadInput = document.getElementById('background-image-upload');
    if (urlInput) urlInput.value = '';
    if (uploadInput) uploadInput.value = '';
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
    const nextName = String(val ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20) || "ゲスト";

    userConfig.username = nextName;
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
    userConfig.bgImage = '';
    applyStyles();
    save();
    
    document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        renderBgSelector();
    }
}

function setBackgroundImageUrl(value) {
    const url = value.trim();
    if (!/^https:\/\/.+/i.test(url)) {
        alert('HTTPSで始まる画像URLを入力してください。');
        return;
    }
    userConfig.bgImage = url;
    applyStyles();
    save();
    renderColorCombos();
    renderBgPresets();
    renderBgSelector();
}

function setBackgroundImageFile(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) {
        alert('PNG、JPEG、WebP、GIF形式の2MB以下の画像を選択してください。');
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => alert('画像を読み込めませんでした。別の画像でお試しください。');
    reader.onload = () => {
        userConfig.bgImage = String(reader.result);
        applyStyles();
        save();
        renderColorCombos();
        renderBgPresets();
        renderBgSelector();
        document.getElementById('background-image-url').value = '';
    };
    reader.readAsDataURL(file);
}

function clearBackgroundImage() {
    userConfig.bgImage = '';
    applyStyles();
    save();
    renderColorCombos();
    renderBgPresets();
    renderBgSelector();
    document.getElementById('background-image-url').value = '';
    document.getElementById('background-image-upload').value = '';
}

// 設定パネルトグル
export function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const overlay = document.getElementById('settings-overlay');
    const isOpen = panel.classList.toggle('active');
    panel.inert = !isOpen;
    document.querySelector('[aria-label="Quickパネル"]')?.setAttribute('aria-expanded', String(isOpen));
    overlay?.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
        settingsTrigger = document.activeElement;
        panel.querySelector('button')?.focus({ preventScroll: true });
    } else {
        settingsTrigger?.focus({ preventScroll: true });
    }
}
