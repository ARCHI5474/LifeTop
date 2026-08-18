/* LifeTop - bookmarks */
const FAVICON_CACHE_KEY = 'favicon_cache'; 
import { FIXED_BOOKMARKS, userConfig } from "./config.js";
import { save } from "./storage.js";

let bookmarkEditMode = false;
let currentBookmarkTab = "ブックマーク";

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
    
    // --- 1. カテゴリタブのレンダリング ---
    const allCategories = ["ブックマーク", ...Object.keys(FIXED_BOOKMARKS)];
    tabsContainer.innerHTML = allCategories.map(cat => {
        const activeClass = (cat === currentBookmarkTab) ? 'active' : '';
        return `<span class="bookmark-tab-item ${activeClass}" onclick="switchBookmarkTab('${cat}')">${cat}</span>`;
    }).join('');

    // 「お気に入り」フォルダ以外のときは、追加/編集ボタンを非表示にする
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

    // --- 2. ブックマークリストの取得 ---
    let bookmarksToRender = [];
    let isFixed = false;

    if (currentBookmarkTab === "ブックマーク") {
        bookmarksToRender = userConfig.bookmarks || [];
    } else {
        bookmarksToRender = FIXED_BOOKMARKS[currentBookmarkTab] || [];
        isFixed = true; // 固定フォルダのブックマークは削除不可
    }

    if (bookmarksToRender.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 4; text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px 0;">ブックマークがありません</div>`;
        return;
    }
    
const FAVICON_CACHE_KEY = "lifetop_favicon_cache";
const FAVICON_CACHE_DAYS = 30;

let faviconCache = {};

try {
    faviconCache = JSON.parse(
        localStorage.getItem(FAVICON_CACHE_KEY) || "{}"
    );
} catch (e) {
    faviconCache = {};
}

    grid.innerHTML = bookmarksToRender.map((b, index) => {
        let domain = "";
        try {
            domain = new URL(b.url).hostname;
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
    ? `<span class="icon-letter">${b.title[0]}</span>
       <img
           src="${faviconUrl}"
           alt="${b.title}"
           style="display:none"
           onload="handleFaviconLoad(this, '${domain}', '${faviconUrl}')"
           onerror="handleFaviconError(this, '${domain}')"
       >`
    : `<span class="icon-letter">${b.title[0]}</span>`;
            
        // プリセットブックマークの場合は削除ボタンを非表示にする
        const deleteBtnHtml = isFixed ? "" : `
            <button class="bookmark-delete-btn" onclick="deleteBookmark(${index}, event)">
                <span class="material-symbols-outlined" style="font-size:12px">close</span>
            </button>
        `;

        return `
            <div class="bookmark-item-wrapper" style="position: relative;">
                <a href="${b.url}" class="bookmark-item" target="_blank" title="${b.title}">
                    <div class="icon-wrapper">
                        ${iconHtml}
                    </div>
                    <span class="bookmark-title">${b.title}</span>
                </a>
                ${deleteBtnHtml}
            </div>
        `;
    }).join('');
}

// フォルダ切り替え
export function switchBookmarkTab(cat) {
    currentBookmarkTab = cat;
    renderBookmarks();
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

export function addBookmark() {
    const title = prompt("ブックマーク名を入力してください:");
    if (!title) return;
    let url = prompt("URLを入力してください:", "https://");
    if (!url) return;
    
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
    
    userConfig.bookmarks.push({ title, url });
    save();
    renderBookmarks();
}

export function deleteBookmark(index, event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`「${userConfig.bookmarks[index].title}」を削除しますか？`)) {
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
        const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || '{}');
        cache[domain] = {
            url: faviconUrl,
            timestamp: Date.now()
        };
        localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
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
        const cache = JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || '{}');
        delete cache[domain];
        localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Failed to clear favicon cache", e);
    }
}


