/* LifeTop - bookmarks (with folder management, drag-and-drop & touch reordering) */
import { FIXED_BOOKMARKS, userConfig } from "./config.js?v=4.2-expressive";
import { save } from "./storage.js?v=4.0-final";

let bookmarkEditMode = false;
let currentBookmarkTab = "ブックマーク";
let activeFolderId = null;
let dialogMode = "link"; // "link" | "folder"
let draggedBookmarkIndex = null;
let bookmarkDialogTrigger = null;
let deletedBookmark = null;
const FAVICON_CACHE_KEY = "lifetop_favicon_cache";
const FAVICON_CACHE_DAYS = 30;

let faviconCache = {};

try {
    const parsed = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || "{}");
    faviconCache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
} catch {
    faviconCache = {};
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#x27;', '"': '&quot;'
    })[char]);
}

function getSafeUrl(value) {
    try {
        const url = new URL(String(value));
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

function getActiveFolder() {
    if (!activeFolderId || !Array.isArray(userConfig.bookmarks)) return null;
    const found = userConfig.bookmarks.find(item => item && item.type === 'folder' && item.id === activeFolderId);
    if (!found) {
        activeFolderId = null;
        return null;
    }
    if (!Array.isArray(found.children)) found.children = [];
    return found;
}

function getTargetList() {
    const folder = getActiveFolder();
    if (folder) return folder.children;
    if (!Array.isArray(userConfig.bookmarks)) userConfig.bookmarks = [];
    return userConfig.bookmarks;
}

function getUserFolders() {
    if (!Array.isArray(userConfig.bookmarks)) return [];
    return userConfig.bookmarks.filter(item => item && item.type === 'folder' && item.id);
}

function syncEditButtonState(btn, isEditing) {
    if (!btn) return;
    btn.classList?.toggle?.('active', isEditing);
    btn.setAttribute?.('aria-pressed', String(isEditing));
    btn.title = isEditing ? '編集を完了' : 'ブックマークを編集・並べ替え';
    btn.setAttribute?.('aria-label', isEditing ? 'ブックマークの編集を完了' : 'ブックマークを編集・並べ替え');
    btn.innerHTML = isEditing
        ? '<span class="material-symbols-outlined" aria-hidden="true">check</span>'
        : '<span class="material-symbols-outlined" aria-hidden="true">edit</span>';
}

// ブックマーク編集モード切り替え
export function toggleBookmarkEditMode() {
    bookmarkEditMode = !bookmarkEditMode;
    const card = document.querySelector?.('.bookmark-card');
    const btn = document.getElementById('edit-bookmarks-btn');
    
    if (bookmarkEditMode) {
        card?.classList?.add?.('edit-mode');
    } else {
        card?.classList?.remove?.('edit-mode');
    }
    syncEditButtonState(btn, bookmarkEditMode);
    renderBookmarks();
}

function syncTabScrollButtons(tabsContainer) {
    if (!tabsContainer || typeof tabsContainer.scrollLeft !== 'number') return;
    const prevBtn = document.querySelector?.('.tab-scroll-btn.prev');
    const nextBtn = document.querySelector?.('.tab-scroll-btn.next');
    const maxScroll = Math.max(0, (tabsContainer.scrollWidth || 0) - (tabsContainer.clientWidth || 0));
    if (prevBtn && 'disabled' in prevBtn) prevBtn.disabled = tabsContainer.scrollLeft <= 2;
    if (nextBtn && 'disabled' in nextBtn) nextBtn.disabled = tabsContainer.scrollLeft >= maxScroll - 2;
}

function bindGridDragAndDrop(grid) {
    if (!grid || grid.dataset?.dndBound || !grid.addEventListener) return;
    if (grid.dataset) grid.dataset.dndBound = 'true';

    grid.addEventListener('dragstart', (event) => {
        if (currentBookmarkTab !== 'ブックマーク') return;
        const wrapper = event.target?.closest?.('.bookmark-item-wrapper[data-bm-index]');
        if (!wrapper) return;
        draggedBookmarkIndex = Number(wrapper.dataset.bmIndex);
        wrapper.classList?.add?.('is-dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            try { event.dataTransfer.setData('text/plain', String(draggedBookmarkIndex)); } catch {}
        }
    });

    grid.addEventListener('dragend', () => {
        draggedBookmarkIndex = null;
        grid.querySelectorAll?.('.is-dragging, .drag-over, .drag-over-folder')?.forEach?.(el => {
            el.classList?.remove?.('is-dragging', 'drag-over', 'drag-over-folder');
        });
    });

    grid.addEventListener('dragover', (event) => {
        if (draggedBookmarkIndex === null || currentBookmarkTab !== 'ブックマーク') return;
        const wrapper = event.target?.closest?.('.bookmark-item-wrapper[data-bm-index]');
        if (!wrapper) return;
        const targetIndex = Number(wrapper.dataset.bmIndex);
        if (Number.isNaN(targetIndex) || targetIndex === draggedBookmarkIndex) return;
        event.preventDefault();

        grid.querySelectorAll?.('.drag-over, .drag-over-folder')?.forEach?.(el => {
            if (el !== wrapper) el.classList?.remove?.('drag-over', 'drag-over-folder');
        });

        const list = getTargetList();
        const draggedItem = list[draggedBookmarkIndex];
        const targetItem = list[targetIndex];
        const isTargetFolder = !activeFolderId && targetItem?.type === 'folder' && draggedItem?.type !== 'folder';

        if (isTargetFolder && !bookmarkEditMode) {
            wrapper.classList?.add?.('drag-over-folder');
            wrapper.classList?.remove?.('drag-over');
        } else {
            wrapper.classList?.add?.('drag-over');
            wrapper.classList?.remove?.('drag-over-folder');
        }
    });

    grid.addEventListener('dragleave', (event) => {
        const wrapper = event.target?.closest?.('.bookmark-item-wrapper[data-bm-index]');
        if (wrapper && !wrapper.contains?.(event.relatedTarget)) {
            wrapper.classList?.remove?.('drag-over', 'drag-over-folder');
        }
    });

    grid.addEventListener('drop', (event) => {
        if (draggedBookmarkIndex === null || currentBookmarkTab !== 'ブックマーク') return;
        const wrapper = event.target?.closest?.('.bookmark-item-wrapper[data-bm-index]');
        if (!wrapper) return;
        event.preventDefault();

        const fromIndex = draggedBookmarkIndex;
        const toIndex = Number(wrapper.dataset.bmIndex);
        const dropIntoFolder = wrapper.classList?.contains?.('drag-over-folder');
        draggedBookmarkIndex = null;

        grid.querySelectorAll?.('.is-dragging, .drag-over, .drag-over-folder')?.forEach?.(el => {
            el.classList?.remove?.('is-dragging', 'drag-over', 'drag-over-folder');
        });

        if (Number.isNaN(toIndex) || fromIndex === toIndex) return;

        const list = getTargetList();
        const sourceItem = list[fromIndex];
        const destItem = list[toIndex];

        if (dropIntoFolder && !activeFolderId && destItem?.type === 'folder' && sourceItem && sourceItem.type !== 'folder') {
            if (!Array.isArray(destItem.children)) destItem.children = [];
            const [moved] = list.splice(fromIndex, 1);
            destItem.children.push(moved);
            save();
            renderBookmarks();
            return;
        }

        reorderBookmark(fromIndex, toIndex);
    });
}

// ブックマークのレンダリング
export function renderBookmarks() {
    const grid = document.getElementById('bookmark-grid');
    const tabsContainer = document.getElementById('bookmark-tabs');
    const addBtn = document.querySelector('.add-bookmark-btn');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const actionsRow = document.getElementById('bookmark-actions-row');
    const editBtn = document.getElementById('edit-bookmarks-btn');
    const folderBar = document.getElementById('bookmark-folder-bar');

    grid.classList.toggle('fixed-links', currentBookmarkTab !== 'ブックマーク');
    
    const allCategories = ["ブックマーク", ...Object.keys(FIXED_BOOKMARKS)];
    tabsContainer.innerHTML = allCategories.map(cat => {
        const activeClass = (cat === currentBookmarkTab) ? 'active' : '';
        return `<button type="button" class="bookmark-tab-item ${activeClass}" aria-pressed="${cat === currentBookmarkTab}" onclick="switchBookmarkTab('${cat}')">${cat}</button>`;
    }).join('');

    if (tabsContainer && !tabsContainer.dataset?.wheelBound) {
        if (tabsContainer.dataset) tabsContainer.dataset.wheelBound = 'true';
        tabsContainer.addEventListener?.('wheel', (event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                tabsContainer.scrollLeft += event.deltaY;
            }
        }, { passive: false });
        tabsContainer.addEventListener?.('scroll', () => syncTabScrollButtons(tabsContainer), { passive: true });
        if (typeof window !== 'undefined') {
            window.addEventListener?.('resize', () => syncTabScrollButtons(tabsContainer), { passive: true });
        }
    }
    syncTabScrollButtons(tabsContainer);

    if (grid && !grid.dataset?.editGuardBound) {
        if (grid.dataset) grid.dataset.editGuardBound = 'true';
        grid.addEventListener?.('click', (event) => {
            if (!bookmarkEditMode) return;
            if (event.target?.closest?.('.bookmark-delete-btn, .bookmark-reorder-btn, .bookmark-folder-move-btn')) return;
            const link = event.target?.closest?.('a.bookmark-item');
            if (link) {
                event.preventDefault();
            }
        });
    }
    bindGridDragAndDrop(grid);

    if (currentBookmarkTab !== "ブックマーク") {
        bookmarkEditMode = false;
        activeFolderId = null;
        const card = document.querySelector('.bookmark-card');
        card?.classList?.remove?.('edit-mode');
        syncEditButtonState(editBtn, false);
        
        if (addBtn?.style) addBtn.style.display = 'none';
        if (addFolderBtn?.style) addFolderBtn.style.display = 'none';
        if (actionsRow?.style) actionsRow.style.display = 'none';
        if (editBtn?.style) editBtn.style.display = 'none';
        if (folderBar) {
            folderBar.hidden = true;
            folderBar.innerHTML = '';
        }
    } else {
        if (addBtn?.style) addBtn.style.display = 'flex';
        if (actionsRow?.style) actionsRow.style.display = 'flex';
        if (editBtn?.style) editBtn.style.display = 'grid';
        syncEditButtonState(editBtn, bookmarkEditMode);
    }

    const activeFolder = currentBookmarkTab === "ブックマーク" ? getActiveFolder() : null;
    if (addFolderBtn?.style) {
        addFolderBtn.style.display = (currentBookmarkTab === "ブックマーク" && !activeFolder) ? 'flex' : 'none';
    }

    if (folderBar) {
        if (activeFolder) {
            folderBar.hidden = false;
            const count = activeFolder.children?.length || 0;
            folderBar.innerHTML = `
                <button type="button" class="folder-back-btn" onclick="closeBookmarkFolder()">
                    <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                    <span>戻る</span>
                </button>
                <div class="folder-bar-title">
                    <span class="material-symbols-outlined folder-bar-icon" aria-hidden="true">folder_open</span>
                    <span class="folder-bar-name">${escapeHtml(activeFolder.title)}</span>
                    <span class="folder-bar-count">${count}件</span>
                </div>
                <button type="button" class="folder-rename-btn" onclick="renameBookmarkFolder('${escapeHtml(activeFolder.id)}')" title="フォルダ名を変更" aria-label="フォルダ名を変更">
                    <span class="material-symbols-outlined" aria-hidden="true">edit_square</span>
                </button>
            `;
        } else {
            folderBar.hidden = true;
            folderBar.innerHTML = '';
        }
    }

    let bookmarksToRender = [];
    let isFixed = false;

    if (currentBookmarkTab === "ブックマーク") {
        bookmarksToRender = activeFolder ? (activeFolder.children || []) : (userConfig.bookmarks || []);
    } else {
        bookmarksToRender = FIXED_BOOKMARKS[currentBookmarkTab] || [];
        isFixed = true;
    }

    const indexedEntries = bookmarksToRender.map((item, originalIndex) => ({ item, originalIndex }));

    if (indexedEntries.length === 0) {
        const emptyText = activeFolder
                ? `「${escapeHtml(activeFolder.title)}」フォルダはまだ空です。「サイトを追加」から登録できます。`
                : `「サイトを追加」や「フォルダを作成」から、よく使うサイトを整理できます。`;
        grid.innerHTML = `<div class="bookmark-empty"><span class="material-symbols-outlined" aria-hidden="true">${activeFolder ? 'folder_open' : 'bookmark_add'}</span><span>${emptyText}</span></div>`;
        return;
    }

    const availableFolders = getUserFolders();
    const totalCount = bookmarksToRender.length;
    
    grid.innerHTML = indexedEntries.map(({ b: _unused, item: b, originalIndex: index }, renderIdx) => {
        const staggerIdx = Math.min(renderIdx, 12);
        const isFirst = index === 0;
        const isLast = index === totalCount - 1;

        const reorderControlsHtml = isFixed ? "" : `
            <div class="bookmark-edit-bar" role="group" aria-label="並べ替えと整理">
                <button type="button" class="bookmark-reorder-btn" ${isFirst ? 'disabled' : ''} aria-label="前へ移動" title="前へ移動" onclick="moveBookmark(${index}, -1, event)">
                    <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                </button>
                ${activeFolder ? `
                    <button type="button" class="bookmark-folder-move-btn" aria-label="フォルダから出す" title="フォルダから出す" onclick="removeBookmarkFromFolder(${index}, event)">
                        <span class="material-symbols-outlined" aria-hidden="true">drive_file_move_rtl</span>
                    </button>
                ` : (b.type !== 'folder' && availableFolders.length > 0 ? `
                    <button type="button" class="bookmark-folder-move-btn" aria-label="フォルダへ移動" title="フォルダへ移動" onclick="promptMoveToFolder(${index}, event)">
                        <span class="material-symbols-outlined" aria-hidden="true">drive_file_move</span>
                    </button>
                ` : '')}
                <button type="button" class="bookmark-reorder-btn" ${isLast ? 'disabled' : ''} aria-label="次へ移動" title="次へ移動" onclick="moveBookmark(${index}, 1, event)">
                    <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
            </div>
        `;

        // フォルダアイテムの描画
        if (!isFixed && b && b.type === 'folder') {
            const folderTitle = String(b.title || 'フォルダ');
            const folderId = String(b.id || '');
            const children = Array.isArray(b.children) ? b.children : [];
            const previewLetters = children.slice(0, 4).map(ch => escapeHtml(String(ch?.title || '•')[0])).join('');
            const deleteBtnHtml = `
                <button type="button" class="bookmark-delete-btn close-action" aria-label="フォルダ「${escapeHtml(folderTitle)}」を削除" onclick="deleteBookmark(${index}, event)">
                    <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
            `;
            return `
                <div class="bookmark-item-wrapper is-folder-wrapper" draggable="true" data-bm-index="${index}" style="position: relative; --item-idx: ${staggerIdx};">
                    <button type="button" class="bookmark-item bookmark-folder-item" title="${escapeHtml(folderTitle)} (${children.length}件)" onclick="openBookmarkFolder('${escapeHtml(folderId)}')">
                        <div class="icon-wrapper folder-icon-wrapper" aria-hidden="true">
                            <span class="material-symbols-outlined folder-glyph">folder</span>
                            <span class="folder-count-badge">${children.length}</span>
                        </div>
                        <span class="bookmark-title">${escapeHtml(folderTitle)}</span>
                        ${previewLetters ? `<span class="folder-mini-hint" aria-hidden="true">${children.length}サイト</span>` : `<span class="folder-mini-hint" aria-hidden="true">空のフォルダ</span>`}
                    </button>
                    ${deleteBtnHtml}
                    ${reorderControlsHtml}
                </div>
            `;
        }

        const title = String(b.title || 'ブックマーク');
        const url = getSafeUrl(b.url);
        let domain = "";
        try {
            domain = url ? new URL(url).hostname : "";
        } catch {
            domain = "";
        }

        // Never interpolate arbitrary persisted URLs into HTML or event handlers.
        const faviconUrl = domain
            ? `https://a.favicon.im/${encodeURIComponent(domain)}?larger=true&throw-error-on-404=true`
            : "";

        const iconHtml = faviconUrl
        ? `<span class="icon-letter">${escapeHtml(title[0])}</span>
           <img
               src="${escapeHtml(faviconUrl)}"
               alt="" aria-hidden="true" decoding="async"
               style="display:none"
               onload="handleFaviconLoad(this, ${escapeHtml(JSON.stringify(domain))}, ${escapeHtml(JSON.stringify(faviconUrl))})"
               onerror="handleFaviconError(this, ${escapeHtml(JSON.stringify(domain))})"
           >`
        : `<span class="icon-letter">${escapeHtml(title[0])}</span>`;
            
        const deleteBtnHtml = isFixed ? "" : `
            <button type="button" class="bookmark-delete-btn close-action" aria-label="${escapeHtml(title)}を削除" onclick="deleteBookmark(${index}, event)">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
        `;

        const linkAttrs = url
            ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`
            : `href="javascript:void(0)" onclick="event.preventDefault();" style="opacity: 0.6; cursor: not-allowed;"`;

        return `
            <div class="bookmark-item-wrapper" ${isFixed ? '' : `draggable="true" data-bm-index="${index}"`} style="position: relative; --item-idx: ${staggerIdx};">
                <a ${linkAttrs} class="bookmark-item" title="${escapeHtml(title)}">
                    <div class="icon-wrapper" aria-hidden="true">
                        ${iconHtml}
                    </div>
                    <span class="bookmark-title">${escapeHtml(title)}</span>
                </a>
                ${deleteBtnHtml}
                ${reorderControlsHtml}
            </div>
        `;
    }).join('');
}

// フォルダを開く・閉じる・名前変更
export function openBookmarkFolder(folderId) {
    if (bookmarkEditMode) return;
    if (!folderId) return;
    activeFolderId = folderId;
    renderBookmarks();
}

export function closeBookmarkFolder() {
    activeFolderId = null;
    renderBookmarks();
}

export function renameBookmarkFolder(folderId) {
    const folders = getUserFolders();
    const target = folders.find(f => f.id === folderId) || getActiveFolder();
    if (!target) return;
    const nextTitle = prompt('新しいフォルダ名を入力してください:', target.title);
    if (nextTitle === null) return;
    const trimmed = nextTitle.trim().slice(0, 20);
    if (!trimmed) return;
    target.title = trimmed;
    save();
    renderBookmarks();
}

// 並べ替え（ボタン操作およびドラッグ＆ドロップ）
export function reorderBookmark(fromIndex, toIndex) {
    const list = getTargetList();
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) {
        return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    save();
    renderBookmarks();
}

export function moveBookmark(index, delta, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const list = getTargetList();
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    reorderBookmark(index, targetIndex);
}

export function promptMoveToFolder(index, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const folders = getUserFolders();
    if (!folders.length || activeFolderId) return;
    const list = userConfig.bookmarks || [];
    const item = list[index];
    if (!item || item.type === 'folder') return;

    if (folders.length === 1) {
        const targetFolder = folders[0];
        if (!Array.isArray(targetFolder.children)) targetFolder.children = [];
        list.splice(index, 1);
        targetFolder.children.push(item);
        save();
        renderBookmarks();
        return;
    }

    const optionsText = folders.map((f, i) => `${i + 1}: ${f.title}`).join('\n');
    const input = prompt(`「${item.title}」を移動するフォルダ番号を入力してください:\n${optionsText}`, '1');
    if (input === null) return;
    const chosenIdx = parseInt(input.trim(), 10) - 1;
    const targetFolder = folders[chosenIdx];
    if (!targetFolder) return;
    if (!Array.isArray(targetFolder.children)) targetFolder.children = [];
    list.splice(index, 1);
    targetFolder.children.push(item);
    save();
    renderBookmarks();
}

export function removeBookmarkFromFolder(index, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const folder = getActiveFolder();
    if (!folder || !Array.isArray(folder.children)) return;
    const [removed] = folder.children.splice(index, 1);
    if (!removed) return;
    userConfig.bookmarks.push(removed);
    save();
    renderBookmarks();
}

// カテゴリタブ切り替え
export function switchBookmarkTab(cat) {
    if (cat !== 'ブックマーク' && !Object.hasOwn(FIXED_BOOKMARKS, cat)) return;
    if (currentBookmarkTab === cat && !activeFolderId) return;
    currentBookmarkTab = cat;
    activeFolderId = null;
    renderBookmarks();
    const activeTab = document.querySelector('.bookmark-tab-item.active');
    activeTab?.focus({ preventScroll: true });
    const tabs = document.getElementById('bookmark-tabs');
    if (activeTab && tabs) {
        const left = activeTab.offsetLeft - tabs.offsetLeft;
        let nextScroll = null;
        if (left < tabs.scrollLeft) nextScroll = Math.max(0, left - 12);
        else if (left + activeTab.offsetWidth > tabs.scrollLeft + tabs.clientWidth) {
            nextScroll = left + activeTab.offsetWidth - tabs.clientWidth + 12;
        }
        if (nextScroll !== null) {
            if (typeof tabs.scrollTo === 'function') {
                tabs.scrollTo({ left: nextScroll, behavior: userConfig.reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
            } else {
                tabs.scrollLeft = nextScroll;
            }
        }
        syncTabScrollButtons(tabs);
    }
}

// タブを矢印ボタンで左右にスムーズスクロールさせる
export function scrollTabs(distance) {
    const tabsContainer = document.getElementById('bookmark-tabs');
    if (tabsContainer) {
        tabsContainer.scrollBy({
            left: distance,
            behavior: 'smooth'
        });
    }
}

function syncDialogModeUI(mode) {
    dialogMode = mode === 'folder' ? 'folder' : 'link';
    const titleEl = document.getElementById('bookmark-dialog-title');
    const urlFieldWrap = document.getElementById('bookmark-url-field-wrap');
    const folderSelectWrap = document.getElementById('bookmark-folder-select-wrap');
    const urlInput = document.getElementById('bookmark-url-input');
    const titleLabel = document.getElementById('bookmark-title-label');
    const titleInput = document.getElementById('bookmark-title-input');
    const folderSelect = document.getElementById('bookmark-folder-select');

    document.querySelectorAll?.('[data-bm-dialog-mode]')?.forEach?.(btn => {
        const active = btn.dataset.bmDialogMode === dialogMode;
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-selected', String(active));
    });

    if (dialogMode === 'folder') {
        if (titleEl) titleEl.textContent = 'フォルダを作成';
        if (titleLabel) titleLabel.textContent = 'フォルダ名';
        if (titleInput) titleInput.placeholder = '例: 仕事・よく使うツール';
        if (urlFieldWrap) urlFieldWrap.hidden = true;
        if (folderSelectWrap) folderSelectWrap.hidden = true;
        if (urlInput) urlInput.required = false;
    } else {
        if (titleEl) titleEl.textContent = 'Quickアクセスを追加';
        if (titleLabel) titleLabel.textContent = 'サイト名';
        if (titleInput) titleInput.placeholder = '例: Notion';
        if (urlFieldWrap) urlFieldWrap.hidden = false;
        if (urlInput) urlInput.required = true;

        const folders = getUserFolders();
        if (folderSelect && folderSelectWrap) {
            if (folders.length > 0) {
                folderSelectWrap.hidden = false;
                folderSelect.innerHTML = `<option value="">なし（メイン一覧）</option>` +
                    folders.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.title)}</option>`).join('');
                folderSelect.value = activeFolderId || '';
            } else {
                folderSelectWrap.hidden = true;
                folderSelect.innerHTML = '<option value="">なし</option>';
            }
        }
    }
}

export function switchBookmarkDialogMode(mode) {
    syncDialogModeUI(mode);
    document.getElementById('bookmark-title-input')?.focus?.();
}

export function openBookmarkDialog(mode = 'link') {
    const overlay = document.getElementById('bookmark-dialog-overlay');
    const dialog = document.getElementById('bookmark-dialog');
    if (!overlay || !dialog) return;
    if (!dialog.classList.contains('active')) bookmarkDialogTrigger = document.activeElement;
    syncDialogModeUI(mode);
    document.getElementById('bookmark-dialog-error').textContent = '';
    document.getElementById('bookmark-url-input')?.removeAttribute('aria-invalid');
    dialog.inert = false;
    overlay.classList.add('active');
    dialog.classList.add('active');
    if (document.body?.style) document.body.style.overflow = 'hidden';
    setTimeout(() => {
        if (dialog.classList.contains('active')) document.getElementById('bookmark-title-input')?.focus({ preventScroll: true });
    }, 50);
}

export function openFolderDialog() {
    openBookmarkDialog('folder');
}

export function closeBookmarkDialog() {
    const overlay = document.getElementById('bookmark-dialog-overlay');
    const dialog = document.getElementById('bookmark-dialog');
    if (!overlay || !dialog) return;
    overlay.classList.remove('active');
    dialog.classList.remove('active');
    dialog.inert = true;
    if (document.body?.style) document.body.style.overflow = '';
    const form = document.getElementById('bookmark-dialog-form');
    form?.reset();
    syncDialogModeUI('link');
    const trigger = bookmarkDialogTrigger;
    bookmarkDialogTrigger = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}

export function createBookmarkFolder(folderNameInput) {
    const title = (folderNameInput ?? document.getElementById('bookmark-title-input')?.value ?? '').trim().slice(0, 20);
    if (!title) return;
    if (!Array.isArray(userConfig.bookmarks)) userConfig.bookmarks = [];
    const newFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'folder',
        title,
        children: []
    };
    userConfig.bookmarks.push(newFolder);
    save();
    renderBookmarks();
    closeBookmarkDialog();
}

export function addBookmark(titleInput, urlInput, targetFolderIdInput) {
    if (dialogMode === 'folder' && !urlInput) {
        createBookmarkFolder(titleInput);
        return;
    }

    const title = (titleInput ?? '').trim() || (document.getElementById('bookmark-title-input')?.value ?? '').trim();
    let url = (urlInput ?? '').trim() || (document.getElementById('bookmark-url-input')?.value ?? '').trim();
    if (!title) return;
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
    const safeUrl = getSafeUrl(url);
    if (!safeUrl) {
        const error = document.getElementById('bookmark-dialog-error');
        error.textContent = '有効なサイトのURLを入力してください（例：example.com）。';
        document.getElementById('bookmark-url-input')?.setAttribute('aria-invalid', 'true');
        return;
    }

    document.getElementById('bookmark-url-input')?.removeAttribute('aria-invalid');
    const selectedFolderId = targetFolderIdInput ?? document.getElementById('bookmark-folder-select')?.value ?? activeFolderId ?? '';
    const newEntry = { title, url: safeUrl };

    if (selectedFolderId) {
        const folder = getUserFolders().find(f => f.id === selectedFolderId);
        if (folder) {
            if (!Array.isArray(folder.children)) folder.children = [];
            folder.children.push(newEntry);
        } else {
            userConfig.bookmarks.push(newEntry);
        }
    } else {
        userConfig.bookmarks.push(newEntry);
    }

    save();
    renderBookmarks();
    closeBookmarkDialog();
}

function updateBookmarkUndoUI() {
    const undoBar = document.getElementById('bookmark-undo');
    const undoText = document.getElementById('bookmark-undo-text');
    if (!undoBar) return;
    if (!deletedBookmark) {
        undoBar.hidden = true;
        return;
    }
    const label = deletedBookmark.item?.type === 'folder'
        ? `フォルダ「${deletedBookmark.item.title}」を削除しました`
        : `「${deletedBookmark.item?.title || 'ブックマーク'}」を削除しました`;
    if (undoText) undoText.textContent = label;
    undoBar.hidden = false;
}

export function deleteBookmark(index, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const list = getTargetList();
    const item = list?.[index];
    if (!item) return;

    const cloned = JSON.parse(JSON.stringify(item));
    deletedBookmark = {
        item: cloned,
        index,
        folderId: activeFolderId || null
    };

    list.splice(index, 1);
    save();
    renderBookmarks();
    updateBookmarkUndoUI();
    document.querySelector?.('#bookmark-undo button')?.focus?.();
}

export function undoDeleteBookmark() {
    if (!deletedBookmark) return;
    const { item, index, folderId } = deletedBookmark;
    deletedBookmark = null;

    if (currentBookmarkTab !== "ブックマーク") {
        currentBookmarkTab = "ブックマーク";
    }

    let targetList = userConfig.bookmarks;
    if (!Array.isArray(targetList)) {
        userConfig.bookmarks = [];
        targetList = userConfig.bookmarks;
    }

    if (folderId) {
        const folder = userConfig.bookmarks.find(f => f && f.type === 'folder' && f.id === folderId);
        if (folder) {
            if (!Array.isArray(folder.children)) folder.children = [];
            targetList = folder.children;
            activeFolderId = folderId;
        } else {
            activeFolderId = null;
        }
    } else {
        activeFolderId = null;
    }

    const insertAt = Math.max(0, Math.min(index, targetList.length));
    targetList.splice(insertAt, 0, item);
    updateBookmarkUndoUI();
    save();
    renderBookmarks();
}

export function handleFaviconLoad(imgEl, domain, faviconUrl) {
    imgEl.style.display = 'block';
    if (imgEl.previousElementSibling) {
        imgEl.previousElementSibling.style.display = 'none';
    }
    try {
        const cached = faviconCache[domain];
        if (cached?.url === faviconUrl && Date.now() - cached.timestamp < 1000 * 60 * 60 * 24 * FAVICON_CACHE_DAYS) return;
        faviconCache[domain] = {
            url: faviconUrl,
            timestamp: Date.now()
        };
        localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(faviconCache));
    } catch (e) {
        console.error("Failed to save favicon cache", e);
    }
}

export function handleFaviconError(imgEl, domain) {
    imgEl.style.display = 'none';
    if (imgEl.previousElementSibling) {
        imgEl.previousElementSibling.style.display = 'block';
    }
    try {
        delete faviconCache[domain];
        localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(faviconCache));
    } catch (e) {
        console.error("Failed to clear favicon cache", e);
    }
}
