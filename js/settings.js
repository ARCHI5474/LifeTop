/* LifeTop - settings panel controls */
import { colorCombos, bgPresets, clockDesigns, userConfig } from "./config.js?v=9.0";
import { applyStyles, renderColorCombos, renderBgPresets, renderBgSelector } from "./styles.js?v=9.0";
import { save } from "./storage.js?v=9.0";
import { updateClock, updateGreeting } from "./clock.js?v=9.0";

let settingsTrigger;
let helpTrigger;
let backgroundRevision = 0;

function savePreferences(values) {
    const previous = Object.fromEntries(Object.keys(values).map(key => [key, userConfig[key]]));
    Object.assign(userConfig, values);
    if (save()) return true;
    Object.assign(userConfig, previous);
    return false;
}

export function toggleHelp() {
    const modal = document.getElementById('help-modal') || document.getElementById('game-modal');
    const overlay = document.getElementById('help-overlay') || document.getElementById('game-overlay');
    if (!modal) return;
    const isOpen = modal.classList.toggle('active');
    modal.inert = !isOpen;
    overlay?.classList.toggle('active', isOpen);
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
        if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
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

    renderClockDesigns();

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
    body.prepend(tabs);
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
    backgroundRevision++;
    if (!savePreferences({bgType:combo.bgType,theme:combo.theme,bgImage:''})) return;
    applyStyles();
    renderColorCombos();
    renderBgPresets();
    document.getElementById('background-image-url').value = '';
    document.getElementById('background-image-upload').value = '';
}

export function setPresetWallpaper(index) {
    const preset = bgPresets[index];
    if (!preset) return;
    backgroundRevision++;
    if (!savePreferences({bgType:preset.bgType,theme:preset.theme,bgImage:preset.url})) return;
    applyStyles();
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
    if (!savePreferences({theme:c})) return;
    applyStyles();
    
    document.querySelectorAll('#theme-colors .color-dot').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
}

export function setFontFamily(f, element) {
    if (!savePreferences({fontFamily:f})) return;
    applyStyles();
    
    document.querySelectorAll('#font-styles .font-btn').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
}

export function renderClockDesigns() {
    const picker=document.getElementById('clock-designs');
    if(!picker)return;
    picker.innerHTML=clockDesigns.map(design=>`<button type="button" class="clock-design-option" data-clock-design="${design.id}" aria-pressed="${userConfig.clockDesign===design.id}" onclick="setClockDesign('${design.id}')"><span class="clock-design-preview" aria-hidden="true">10:08</span><strong>${design.name}</strong><span>${design.description}</span></button>`).join('');
}
export function setClockDesign(id) {
    if(!clockDesigns.some(design=>design.id===id)||!savePreferences({clockDesign:id}))return;
    document.querySelectorAll('#clock-designs [data-clock-design]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.clockDesign===id)));
}

export function saveUsername(val) {
    const nextName = String(val ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20) || "ゲスト";

    savePreferences({username:nextName});
    updateGreeting();
}

export function toggleClock12h(checked) {
    savePreferences({clock12h:checked});
    document.getElementById('clock-12h-toggle').checked = userConfig.clock12h;
    updateClock();
}

export function toggleClockSec(checked) {
    savePreferences({clockShowSec:checked});
    document.getElementById('clock-show-sec-toggle').checked = userConfig.clockShowSec;
    
    const secEl = document.getElementById('clock-sec');
    secEl.style.display = userConfig.clockShowSec ? 'block' : 'none';
    updateClock();
}

// 背景の選択
export function setBg(type, element) {
    backgroundRevision++;
    if (!savePreferences({bgType:type,bgImage:''})) return;
    applyStyles();
    
    document.querySelectorAll('.bg-option').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        renderBgSelector();
    }
}

function setBackgroundImageUrl(value) {
    backgroundRevision++;
    const url = value.trim();
    let parsed;
    try { parsed = new URL(url); } catch { parsed = null; }
    if (parsed?.protocol !== 'https:' || !parsed.hostname) {
        document.getElementById('background-image-status').textContent = 'HTTPSで始まる画像URLを入力してください。';
        document.getElementById('background-image-url').setAttribute('aria-invalid', 'true');
        document.getElementById('background-image-url').focus();
        return;
    }
    document.getElementById('background-image-url').removeAttribute('aria-invalid');
    commitBackgroundImage(parsed.href);
}

function setBackgroundImageFile(file) {
    if (!file) return;
    const revision = ++backgroundRevision;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) {
        document.getElementById('background-image-status').textContent = 'PNG、JPEG、WebP、GIF形式の2MB以下の画像を選択してください。';
        document.getElementById('background-image-upload').value = '';
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => { if (revision === backgroundRevision) document.getElementById('background-image-status').textContent = '画像を読み込めませんでした。別の画像でお試しください。'; };
    reader.onload = () => {
        if (revision !== backgroundRevision) return;
        if (typeof reader.result !== 'string' || !reader.result.startsWith(`data:${file.type};base64,`)) {
            document.getElementById('background-image-status').textContent = '画像を読み込めませんでした。別の画像でお試しください。';
            return;
        }
        if (commitBackgroundImage(reader.result)) {
            document.getElementById('background-image-url').value = '';
            document.getElementById('background-image-upload').value = '';
        }
    };
    reader.readAsDataURL(file);
}

function commitBackgroundImage(image) {
    backgroundRevision++;
    const previous = userConfig.bgImage;
    userConfig.bgImage = image;
    applyStyles();
    if (!save()) {
        userConfig.bgImage = previous;
        applyStyles();
        return false;
    }
    renderColorCombos();
    renderBgPresets();
    renderBgSelector();
    const status = document.getElementById('background-image-status');
    if (status) status.textContent = image ? '壁紙を設定しました。カードとパネルに透過を適用しています。' : '画像の壁紙を解除しました。';
    return true;
}

function clearBackgroundImage() {
    if (!commitBackgroundImage('')) return;
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
    if (isOpen) {
        settingsTrigger = document.activeElement;
        panel.querySelector('button')?.focus({ preventScroll: true });
    } else {
        settingsTrigger?.focus({ preventScroll: true });
    }
}
