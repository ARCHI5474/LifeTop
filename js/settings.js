/* LifeTop - settings panel controls */
import { colorCombos, fontStyles, userConfig } from "./config.js?v=4.0-final";
import { applyStyles, renderColorCombos, renderBgSelector } from "./styles.js?v=4.0-final";
import { save } from "./storage.js?v=4.0-final";
import { updateClock, updateGreeting } from "./clock.js?v=4.0-final";

let settingsTrigger;

export function toggleHelp() {
    const modal = document.getElementById('help-modal');
    const overlay = document.getElementById('help-overlay');
    const isOpen = modal.classList.toggle('active');
    overlay?.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

// ピッカーの初期化
export function initPickers() {
    renderColorCombos();
    document.getElementById('settings-panel').addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button, input, select, textarea, a[href]')]
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

    imageUrlInput.value = userConfig.bgImage.startsWith('https://') ? userConfig.bgImage : '';
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

export function setColorCombo(index) {
    const combo = colorCombos[index];
    if (!combo) return;
    userConfig.bgType = combo.bgType;
    userConfig.theme = combo.theme;
    userConfig.bgImage = '';
    applyStyles();
    save();
    renderColorCombos();
    document.getElementById('background-image-url').value = '';
    document.getElementById('background-image-upload').value = '';
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
    overlay?.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
        settingsTrigger = document.activeElement;
        panel.querySelector('button')?.focus();
    } else {
        settingsTrigger?.focus();
    }
}
