let activeIndex = -1;
let suggestions = [];
let searchTimer;
let requestController;
const suggestionCache = new Map();
let jsonpCounter = 0;

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
        if (document.querySelector('.settings-panel.active, .help-modal.active, .weather-modal.active, #bookmark-dialog.active')) return;
        event.preventDefault();
        input.focus();
    });

    const scheduleSuggestions = () => {
        syncClearButton();
        clearSuggestions(input, list);
        const query = input.value.trim();
        if (!query) return;
        searchTimer = window.setTimeout(() => fetchSuggestions(query, input, list), 180);
    };
    input.addEventListener('input', event => {
        syncClearButton();
        if (!event.isComposing) scheduleSuggestions();
    });
    input.addEventListener('compositionstart', () => clearSuggestions(input, list));
    input.addEventListener('compositionend', scheduleSuggestions);

    input.addEventListener('keydown', event => handleKeyboard(event, input, list));
    input.addEventListener('blur', () => window.setTimeout(() => clearSuggestions(input, list), 150));
    document.addEventListener('pointerdown', event => {
        if (!event.target.closest('.search-container')) clearSuggestions(input, list);
    });
    form.addEventListener('submit', event => {
        if (!input.value.trim()) event.preventDefault();
    });
}

async function fetchSuggestions(query, input, list) {
    const cacheKey = query.toLowerCase();
    if (suggestionCache.has(cacheKey)) {
        suggestions = suggestionCache.get(cacheKey);
        renderSuggestions(input, list);
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
        suggestions = result;
        if (suggestionCache.size > 60) {
            const firstKey = suggestionCache.keys().next().value;
            suggestionCache.delete(firstKey);
        }
        suggestionCache.set(cacheKey, result);
        renderSuggestions(input, list);
    } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') clearSuggestions(input, list);
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function renderSuggestions(input, list) {
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
        item.addEventListener('pointerdown', event => event.preventDefault());
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
    activeIndex = -1;
    list.replaceChildren();
    list.classList.remove('active');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
}
