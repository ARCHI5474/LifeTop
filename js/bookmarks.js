/* LifeTop - bookmarks */
import { FIXED_BOOKMARKS, userConfig } from "./config.js?v=4.0-final";
import { save } from "./storage.js?v=4.0-final";

let bookmarkEditMode = false;
let currentBookmarkTab = "ブックマーク";
let bookmarkDialogTrigger = null;
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

function syncEditButtonState(btn, isEditing) {
    if (!btn) return;
    btn.classList?.toggle?.('active', isEditing);
    btn.setAttribute?.('aria-pressed', String(isEditing));
    btn.title = isEditing ? '編集を完了' : 'ブックマークを編集';
    btn.setAttribute?.('aria-label', isEditing ? 'ブックマークの編集を完了' : 'ブックマークを編集');
    btn.innerHTML = isEditing
        ? '<span class="material-symbols-outlined" aria-hidden="true">check</span>'
        : '<span class="material-symbols-outlined" aria-hidden="true">edit</span>';
}

// ブックマーク編集モード切り替え
export function toggleBookmarkEditMode() {
    bookmarkEditMode = !bookmarkEditMode;
    const card = document.querySelector('.bookmark-card');
    const btn = document.getElementById('edit-bookmarks-btn');
    
    if (bookmarkEditMode) {
        card.classList.add('edit-mode');
    } else {
        card.classList.remove('edit-mode');
    }
    syncEditButtonState(btn, bookmarkEditMode);
}

function syncTabScrollButtons(tabsContainer) {
    if (!tabsContainer || typeof tabsContainer.scrollLeft !== 'number') return;
    const prevBtn = document.querySelector?.('.tab-scroll-btn.prev');
    const nextBtn = document.querySelector?.('.tab-scroll-btn.next');
    const maxScroll = Math.max(0, (tabsContainer.scrollWidth || 0) - (tabsContainer.clientWidth || 0));
    if (prevBtn && 'disabled' in prevBtn) prevBtn.disabled = tabsContainer.scrollLeft <= 2;
    if (nextBtn && 'disabled' in nextBtn) nextBtn.disabled = tabsContainer.scrollLeft >= maxScroll - 2;
}

// ブックマークのレンダリング
export function renderBookmarks() {
    const grid = document.getElementById('bookmark-grid');
    const tabsContainer = document.getElementById('bookmark-tabs');
    const addBtn = document.querySelector('.add-bookmark-btn');
    const editBtn = document.getElementById('edit-bookmarks-btn');
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
            if (event.target?.closest?.('.bookmark-delete-btn')) return;
            const link = event.target?.closest?.('.bookmark-item');
            if (link) {
                event.preventDefault();
            }
        });
    }

    if (currentBookmarkTab !== "ブックマーク") {
        bookmarkEditMode = false;
        const card = document.querySelector('.bookmark-card');
        card.classList.remove('edit-mode');
        syncEditButtonState(editBtn, false);
        
        addBtn.style.display = 'none';
        editBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'flex';
        editBtn.style.display = 'grid';
        syncEditButtonState(editBtn, bookmarkEditMode);
    }

    let bookmarksToRender = [];
    let isFixed = false;

    if (currentBookmarkTab === "ブックマーク") {
        bookmarksToRender = userConfig.bookmarks || [];
    } else {
        bookmarksToRender = FIXED_BOOKMARKS[currentBookmarkTab] || [];
        isFixed = true;
    }

    if (bookmarksToRender.length === 0) {
        grid.innerHTML = `<div class="bookmark-empty"><span class="material-symbols-outlined" aria-hidden="true">bookmark_add</span><span>「サイトを追加」から、よく使うサイトを登録できます。</span></div>`;
        return;
    }
    
    grid.innerHTML = bookmarksToRender.map((b, index) => {
        const title = String(b.title || 'ブックマーク');
        const url = getSafeUrl(b.url);
        let domain = "";
        try {
            domain = url ? new URL(url).hostname : "";
        } catch (e) {
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
            <button type="button" class="bookmark-delete-btn" aria-label="${escapeHtml(title)}を削除" onclick="deleteBookmark(${index}, event)">
                <span class="material-symbols-outlined" aria-hidden="true" style="font-size:14px">close</span>
            </button>
        `;

        const linkAttrs = url
            ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`
            : `href="javascript:void(0)" onclick="event.preventDefault();" style="opacity: 0.6; cursor: not-allowed;"`;

        const staggerIdx = Math.min(index, 12);

        return `
            <div class="bookmark-item-wrapper" style="position: relative; --item-idx: ${staggerIdx};">
                <a ${linkAttrs} class="bookmark-item" title="${escapeHtml(title)}">
                    <div class="icon-wrapper" aria-hidden="true">
                        ${iconHtml}
                    </div>
                    <span class="bookmark-title">${escapeHtml(title)}</span>
                </a>
                ${deleteBtnHtml}
            </div>
        `;
    }).join('');
}

// フォルダ切り替え
export function switchBookmarkTab(cat) {
    if (cat !== 'ブックマーク' && !Object.hasOwn(FIXED_BOOKMARKS, cat)) return;
    if (currentBookmarkTab === cat) return;
    currentBookmarkTab = cat;
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
                tabs.scrollTo({ left: nextScroll, behavior: 'smooth' });
            } else {
                tabs.scrollLeft = nextScroll;
            }
        }
        syncTabScrollButtons(tabs);
    }
    const grid = document.getElementById('bookmark-grid');
    if (grid) {
        grid.classList.remove('tab-switching');
        void grid.offsetWidth;
        grid.classList.add('tab-switching');
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

export function openBookmarkDialog() {
    const overlay = document.getElementById('bookmark-dialog-overlay');
    const dialog = document.getElementById('bookmark-dialog');
    if (!overlay || !dialog) return;
    if (!dialog.classList.contains('active')) bookmarkDialogTrigger = document.activeElement;
    dialog.inert = false;
    overlay.classList.add('active');
    dialog.classList.add('active');
    if (document.body?.style) document.body.style.overflow = 'hidden';
    setTimeout(() => {
        if (dialog.classList.contains('active')) document.getElementById('bookmark-title-input')?.focus();
    }, 50);
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
    const trigger = bookmarkDialogTrigger;
    bookmarkDialogTrigger = null;
    if (trigger?.isConnected) trigger.focus();
}

export function addBookmark(titleInput, urlInput) {
    const title = (titleInput ?? '').trim() || (document.getElementById('bookmark-title-input')?.value ?? '').trim();
    let url = (urlInput ?? '').trim() || (document.getElementById('bookmark-url-input')?.value ?? '').trim();
    if (!title) return;
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
    const safeUrl = getSafeUrl(url);
    if (!safeUrl) {
        alert("http:// または https:// で始まる有効なURLを入力してください。");
        return;
    }

    userConfig.bookmarks.push({ title, url: safeUrl });
    save();
    renderBookmarks();
    closeBookmarkDialog();
}

export function deleteBookmark(index, event) {
    event.preventDefault();
    event.stopPropagation();
    const item = userConfig.bookmarks?.[index];
    if (!item) return;
    if (confirm(`「${item.title}」を削除しますか？`)) {
        userConfig.bookmarks.splice(index, 1);
        save();
        renderBookmarks();
    }
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
