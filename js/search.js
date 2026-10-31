import { userConfig } from './config.js?v=8.0';
let activeIndex = -1;
let suggestions = [];
let lastRenderedSignature = '';
let searchTimer;
let requestController;
const suggestionCache = new Map();
let jsonpCounter = 0;

const DEFAULT_QUICK_SUGGESTIONS = [
    '天気予報',
    '最新ニュース',
    'YouTube トレンド',
    'Google 翻訳',
    '乗換案内',
    '周辺のカフェ'
];

function getDefaultStarterSuggestions() {
    try {
        const raw = localStorage.getItem('lifetop_trends_cache_v1');
        if (raw) {
            const parsed = JSON.parse(raw);
            const trendItems = parsed?.jp?.items;
            if (Array.isArray(trendItems) && trendItems.length) {
                const keywords = trendItems
                    .map(item => String(item?.keyword || '').trim())
                    .filter(Boolean)
                    .slice(0, 6);
                if (keywords.length >= 3) return keywords;
            }
        }
    } catch {
        // ignore storage errors
    }
    return DEFAULT_QUICK_SUGGESTIONS;
}

function fetchGoogleSuggestJsonp(query, signal) {
    return new Promise((resolve, reject) => {
        if (typeof document === 'undefined' || !document.head) {
            reject(new Error('No DOM'));
            return;
        }
        const cbName = `__lifetopSuggestCb_${++jsonpCounter}_${Date.now()}`;
        const script = document.createElement('script');
        let settled = false;

        const cleanup = () => {
            settled = true;
            try { delete window[cbName]; } catch { window[cbName] = undefined; }
            script.remove();
        };

        const timer = setTimeout(() => {
            if (!settled) {
                cleanup();
                reject(new Error('JSONP timeout'));
            }
        }, 1200);

        signal?.addEventListener?.('abort', () => {
            clearTimeout(timer);
            if (!settled) {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            }
        }, { once: true });

        window[cbName] = (data) => {
            clearTimeout(timer);
            if (settled) return;
            cleanup();
            const list = Array.isArray(data?.[1]) ? data[1].filter(item => typeof item === 'string').slice(0, 6) : [];
            if (list.length) resolve(list);
            else reject(new Error('Empty suggestions'));
        };

        script.onerror = () => {
            clearTimeout(timer);
            if (!settled) {
                cleanup();
                reject(new Error('JSONP error'));
            }
        };

        script.src = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ja&q=${encodeURIComponent(query)}&callback=${cbName}`;
        document.head.appendChild(script);
    });
}

async function fetchWikiOpenSearch(query, signal) {
    const url = `https://ja.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=6&search=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('Wiki suggest failed');
    const data = await response.json();
    const list = Array.isArray(data?.[1]) ? data[1].filter(item => typeof item === 'string').slice(0, 6) : [];
    if (!list.length) throw new Error('Empty wiki suggestions');
    return list;
}

function buildMergedSuggestions(query, remoteItems = []) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];
    const seen = new Set();
    const merged = [];

    const addCandidate = (text) => {
        const clean = String(text || '').trim();
        if (!clean) return;
        const lower = clean.toLowerCase();
        if (seen.has(lower)) return;
        seen.add(lower);
        merged.push(clean);
    };

    for (const item of remoteItems) {
        if (merged.length >= 6) break;
        addCandidate(item);
    }

    // 入力中のキーワード自体が候補に含まれていない場合でも、入力中は常に最低1件以上の候補を表示し続ける
    if (merged.length === 0) {
        addCandidate(trimmed);
    }

    return merged.slice(0, 6);
}

function getInstantLocalSuggestions(query) {
    const lower = query.toLowerCase();
    if (suggestionCache.has(lower)) {
        return suggestionCache.get(lower);
    }
    const prefixMatches = [];
    for (const [cachedKey, cachedList] of suggestionCache.entries()) {
        if (cachedKey.startsWith(lower) || lower.startsWith(cachedKey)) {
            for (const item of cachedList) {
                if (item.toLowerCase().includes(lower)) {
                    prefixMatches.push(item);
                }
            }
        }
    }
    return buildMergedSuggestions(query, [query, ...prefixMatches]);
}

export function initSearchSuggestions() {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    const form = document.getElementById('search-form');
    const clearBtn = document.getElementById('search-clear-btn');
    if (!input || !list || !form) return;

    form.action = 'https://www.google.com/search';
    input.placeholder = 'Googleで検索';
    form.querySelector('.search-button').setAttribute('aria-label', 'Googleで検索');

    const syncClearButton = () => {
        if (clearBtn) clearBtn.hidden = input.value.length === 0;
    };
    syncClearButton();

    clearBtn?.addEventListener('click', () => {
        input.value = '';
        syncClearButton();
        clearSuggestions(input, list);
        input.focus();
    });

    document.addEventListener('keydown', event => {
        if (event.key !== '/' || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (document.querySelector('.settings-panel.active, .help-modal.active, .weather-modal.active, #bookmark-dialog.active, #game-modal.active')) return;
        event.preventDefault();
        input.focus();
    });

    const scheduleSuggestions = (event) => {
        syncClearButton();
        window.clearTimeout(searchTimer);
        const rawVal = input.value || '';
        const composingData = typeof event?.data === 'string' ? event.data : '';
        const query = (rawVal || composingData).trim();

        if (!query) {
            // スマホ等で検索欄をタップした直後やIME未確定バッファ中も常に候補を表示
            if (document.activeElement === input) {
                suggestions = getDefaultStarterSuggestions();
                renderSuggestions(input, list);
            } else {
                clearSuggestions(input, list);
            }
            return;
        }

        // 入力中は決して候補欄を閉じず、即座にローカル／現在入力中の候補を表示維持したままAPI取得を行う
        suggestions = getInstantLocalSuggestions(query);
        renderSuggestions(input, list);

        const cacheKey = query.toLowerCase();
        if (suggestionCache.has(cacheKey)) {
            return;
        }
        searchTimer = window.setTimeout(() => fetchSuggestions(query, input, list), 70);
    };

    const ensureVisibleOnMobile = () => {
        if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px), (pointer: coarse)')?.matches) {
            const container = input.closest('.search-container');
            window.setTimeout(() => {
                const rect = container?.getBoundingClientRect?.();
                if (rect && rect.top > 110) {
                    container.scrollIntoView?.({ block: 'start', behavior: userConfig.reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
                }
            }, 120);
        }
    };

    input.addEventListener('input', event => {
        scheduleSuggestions(event);
    });
    input.addEventListener('compositionupdate', event => {
        scheduleSuggestions(event);
    });
    input.addEventListener('compositionend', event => {
        scheduleSuggestions(event);
    });
    input.addEventListener('keyup', event => {
        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
            scheduleSuggestions(event);
        }
    });
    input.addEventListener('focus', () => {
        ensureVisibleOnMobile();
        scheduleSuggestions();
    });

    input.addEventListener('keydown', event => handleKeyboard(event, input, list));
    input.addEventListener('blur', () => window.setTimeout(() => {
        // 入力欄に文字がある間はスマホのキーボード「完了」押下時でも候補を閉じない
        if (document.activeElement !== input && !input.value.trim()) {
            clearSuggestions(input, list);
        }
    }, 180));

    let pointerStartPos = null;
    document.addEventListener('pointerdown', event => {
        pointerStartPos = { x: event.clientX, y: event.clientY, target: event.target };
    }, { passive: true });

    document.addEventListener('pointerup', event => {
        if (!pointerStartPos) return;
        const dx = Math.abs(event.clientX - pointerStartPos.x);
        const dy = Math.abs(event.clientY - pointerStartPos.y);
        const startTarget = pointerStartPos.target;
        pointerStartPos = null;
        // スクロール操作（指の移動 > 10px）では絶対に候補を閉じない。検索エリア外の明確なタップ時のみ閉じる
        if (dx < 10 && dy < 10 && !startTarget?.closest?.('.search-container') && !event.target?.closest?.('.search-container')) {
            clearSuggestions(input, list);
        }
    }, { passive: true });

    form.addEventListener('submit', event => {
        if (!input.value.trim()) event.preventDefault();
        else clearSuggestions(input, list);
    });
}

async function fetchSuggestions(query, input, list) {
    const cacheKey = query.toLowerCase();
    if (suggestionCache.has(cacheKey)) {
        if (input.value.trim() === query) {
            suggestions = suggestionCache.get(cacheKey);
            renderSuggestions(input, list);
        }
        return;
    }

    requestController?.abort();
    requestController = new AbortController();
    const controller = requestController;
    const timeoutId = window.setTimeout(() => controller.abort(), 1600);

    try {
        const result = await Promise.any([
            fetchGoogleSuggestJsonp(query, controller.signal),
            fetchWikiOpenSearch(query, controller.signal)
        ]);
        if (controller.signal.aborted || input.value.trim() !== query) return;
        const merged = buildMergedSuggestions(query, result);
        suggestions = merged;
        if (suggestionCache.size > 60) {
            const firstKey = suggestionCache.keys().next().value;
            suggestionCache.delete(firstKey);
        }
        suggestionCache.set(cacheKey, merged);
        renderSuggestions(input, list);
    } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError' && input.value.trim() === query) {
            // APIが0件またはエラーでも、入力中は現在の入力ワード候補を維持して閉じない
            suggestions = buildMergedSuggestions(query, []);
            renderSuggestions(input, list);
        }
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function renderSuggestions(input, list) {
    const signature = suggestions.join('\u0000');
    if (signature === lastRenderedSignature && list.classList.contains('active') === (suggestions.length > 0)) {
        return;
    }
    lastRenderedSignature = signature;
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren(...suggestions.map((suggestion, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-suggestion';
        item.id = `search-suggestion-${index}`;
        item.role = 'option';
        item.tabIndex = -1;
        item.setAttribute('aria-selected', 'false');
        item.textContent = suggestion;
        item.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse') event.preventDefault();
        });
        item.addEventListener('click', () => {
            input.value = suggestion;
            clearSuggestions(input, list);
            input.form.requestSubmit();
        });
        return item;
    }));
    list.classList.toggle('active', suggestions.length > 0);
    input.setAttribute('aria-expanded', String(suggestions.length > 0));
}

function handleKeyboard(event, input, list) {
    if (event.isComposing || event.keyCode === 229) return;
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = event.key === 'ArrowDown'
            ? (activeIndex + 1) % suggestions.length
            : (activeIndex < 0 ? suggestions.length - 1 : (activeIndex - 1 + suggestions.length) % suggestions.length);
        updateActiveSuggestion(input, list);
    } else if (event.key === 'Escape') {
        clearSuggestions(input, list);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        input.value = suggestions[activeIndex];
        clearSuggestions(input, list);
        input.form?.requestSubmit();
    }
}

function updateActiveSuggestion(input, list) {
    list.querySelectorAll('.search-suggestion').forEach((item, index) => {
        item.classList.toggle('active', index === activeIndex);
        item.setAttribute('aria-selected', String(index === activeIndex));
    });
    input.setAttribute('aria-activedescendant', `search-suggestion-${activeIndex}`);
}

function clearSuggestions(input, list) {
    window.clearTimeout(searchTimer);
    requestController?.abort();
    suggestions = [];
    lastRenderedSignature = '';
    activeIndex = -1;
    list.replaceChildren();
    list.classList.remove('active');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
}
