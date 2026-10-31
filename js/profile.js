import { createMaterialIcon } from './icons.js?v=8.0';
import { userConfig } from './config.js?v=8.0';
import { save } from './storage.js?v=8.0';

const icons = { person: 'ひと', face: 'スマイル', pets: '足あと', eco: '葉', rocket_launch: 'ロケット', favorite: 'ハート', star: '星', sports_esports: 'ゲーム' };
let uploadRevision = 0;

export function renderProfile() {
    document.getElementById('profile-name-preview').textContent = userConfig.username || 'ゲスト';
    for (const avatar of document.querySelectorAll('#user-badge .user-avatar, #profile-avatar-preview')) {
        avatar.replaceChildren();
        if (userConfig.profileIcon.startsWith('data:image/')) {
            const img = document.createElement('img');
            img.src = userConfig.profileIcon;
            img.alt = '';
            avatar.append(img);
        } else {
            avatar.append(createMaterialIcon(userConfig.profileIcon));
        }
    }
    for (const button of document.querySelectorAll('[data-profile-icon]')) {
        button.setAttribute('aria-pressed', String(button.dataset.profileIcon === userConfig.profileIcon));
    }
}

export function initProfile() {
    const picker = document.getElementById('profile-icon-picker');
    const upload = document.getElementById('profile-icon-upload');
    const status = document.getElementById('profile-icon-status');
    for (const [key, label] of Object.entries(icons)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.profileIcon = key;
        button.setAttribute('aria-label', label);
        const symbol = createMaterialIcon(key);
        const caption = document.createElement('span');
        caption.className = 'profile-icon-caption';
        caption.textContent = label;
        button.append(symbol, caption);
        button.onclick = () => {
            uploadRevision++;
            userConfig.profileIcon = key;
            upload.value = '';
            status.textContent = 'プロフィールアイコンを変更しました。';
            renderProfile();
            save();
        };
        picker.append(button);
    }
    upload.onchange = () => {
        const file = upload.files?.[0];
        if (!file) return;
        const revision = ++uploadRevision;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            status.textContent = 'PNG・JPEG・WebP形式の2MB以下の画像を選択してください。';
            upload.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => { if (revision === uploadRevision) status.textContent = '画像を読み込めませんでした。'; };
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => { if (revision === uploadRevision) status.textContent = '画像を読み込めませんでした。別の画像を選択してください。'; };
            image.onload = () => {
                if (revision !== uploadRevision) return;
                // Store a small raster avatar, with a centered square crop.
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 192;
                const size = Math.min(image.naturalWidth, image.naturalHeight);
                canvas.getContext('2d').drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 192, 192);
                userConfig.profileIcon = canvas.toDataURL('image/png');
                renderProfile();
                if (save()) status.textContent = 'プロフィール画像を保存しました。';
            };
            image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };
    document.getElementById('profile-icon-reset').onclick = () => {
        uploadRevision++;
        userConfig.profileIcon = 'person';
        upload.value = '';
        renderProfile();
        save();
        status.textContent = 'プロフィールアイコンを初期値に戻しました。';
    };
    document.getElementById('profile-icon-choose').onclick = () => upload.click();
    const nameInput = document.getElementById('username-input');
    const syncName = () => { document.getElementById('profile-name-preview').textContent = userConfig.username || 'ゲスト'; };
    nameInput.addEventListener('input', syncName);
    syncName();
    renderProfile();
}
