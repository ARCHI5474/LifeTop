/* LifeTop - bookmarks */
import { FIXED_BOOKMARKS, userConfig } from "./config.js?v=3.9.24";
import { save } from "./storage.js";

let bookmarkEditMode = false;
let currentBookmarkTab = "ブックマーク";
const FAVICON_CACHE_KEY = "lifetop_favicon_cache";
const FAVICON_CACHE_DAYS = 30;

let faviconCache = {};

try {
    faviconCache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || "{}");
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

// ブックマーク編集モード切り替え
export function toggleBookmarkEditMode() {
    bookmarkEditMode = !bookmarkEditMode;
    const card = document.querySelector('.bookmark-card');
    const btn = document.getElementById('edit-bookmarks-btn');
    
    if (bookmarkEditMode) {
        card.classList.add('edit-mode');
        btn.classList.add('active');
    } else {
        card.classList.remove('edit-mode');
        btn.classList.remove('active');
    }
}

// ブックマークのレンダリング
export function renderBookmarks() {
    const grid = document.getElementById('bookmark-grid');
    const tabsContainer = document.getElementById('bookmark-tabs');
    const addBtn = document.querySelector('.add-bookmark-btn');
    const editBtn = document.getElementById('edit-bookmarks-btn');
    
    const allCategories = ["ブックマーク", ...Object.keys(FIXED_BOOKMARKS)];
    tabsContainer.innerHTML = allCategories.map(cat => {
        const activeClass = (cat === currentBookmarkTab) ? 'active' : '';
        return `<span class="bookmark-tab-item ${activeClass}" onclick="switchBookmarkTab('${cat}')">${cat}</span>`;
    }).join('');

    if (currentBookmarkTab !== "ブックマーク") {
        bookmarkEditMode = false;
        const card = document.querySelector('.bookmark-card');
        card.classList.remove('edit-mode');
        editBtn.classList.remove('active');
        
        addBtn.style.display = 'none';
        editBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'flex';
        editBtn.style.display = 'grid';
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
        grid.innerHTML = `<div style="grid-column: span 4; text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px 0;">ブックマークがありません</div>`;
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

    const cached = domain ? faviconCache[domain] : null;

const cacheValid =
    cached &&
    cached.url &&
    (Date.now() - cached.timestamp) < 1000 * 60 * 60 * 24 * FAVICON_CACHE_DAYS;

const faviconUrl = domain
    ? (cacheValid
        ? cached.url
        : `https://a.favicon.im/${domain}?larger=true&throw-error-on-404=true`)
    : "";

    const iconHtml = faviconUrl
    ? `<span class="icon-letter">${escapeHtml(title[0])}</span>
       <img
           src="${faviconUrl}"
           alt="${escapeHtml(title)}"
           style="display:none"
           onload="handleFaviconLoad(this, '${domain}', '${faviconUrl}')"
           onerror="handleFaviconError(this, '${domain}')"
       >`
    : `<span class="icon-letter">${escapeHtml(title[0])}</span>`;
            
        const deleteBtnHtml = isFixed ? "" : `
            <button class="bookmark-delete-btn" onclick="deleteBookmark(${index}, event)">
                <span class="material-symbols-outlined" style="font-size:12px">close</span>
            </button>
        `;

        const linkAttrs = url
            ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`
            : `href="javascript:void(0)" onclick="event.preventDefault();" style="opacity: 0.6; cursor: not-allowed;"`;

        return `
            <div class="bookmark-item-wrapper" style="position: relative; --item-idx: ${index};">
                <a ${linkAttrs} class="bookmark-item" title="${escapeHtml(title)}">
                    <div class="icon-wrapper">
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
    if (currentBookmarkTab === cat) return;
    currentBookmarkTab = cat;
    renderBookmarks();
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
    overlay.classList.add('active');
    dialog.classList.add('active');
    setTimeout(() => {
        document.getElementById('bookmark-title-input')?.focus();
    }, 50);
}

export function closeBookmarkDialog() {
    const overlay = document.getElementById('bookmark-dialog-overlay');
    const dialog = document.getElementById('bookmark-dialog');
    if (!overlay || !dialog) return;
    overlay.classList.remove('active');
    dialog.classList.remove('active');
    const form = document.getElementById('bookmark-dialog-form');
    form?.reset();
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
