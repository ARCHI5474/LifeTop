let activeIndex = -1;
let suggestions = [];
let searchTimer;
let requestController;

export function initSearchSuggestions() {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    const form = document.getElementById('search-form');
    if (!input || !list || !form) return;

    form.action = 'https://www.google.com/search';
    input.placeholder = 'Googleで検索';
    form.querySelector('.search-button').setAttribute('aria-label', 'Googleで検索');
    document.addEventListener('keydown', event => {
        if (event.key !== '/' || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (document.querySelector('.settings-panel.active, .help-modal.active, .weather-modal.active, #bookmark-dialog.active')) return;
        event.preventDefault();
        input.focus();
    });

    const scheduleSuggestions = () => {
        clearSuggestions(input, list);
        const query = input.value.trim();
        if (!query) return;
        searchTimer = window.setTimeout(() => fetchSuggestions(query, input, list), 180);
    };
    input.addEventListener('input', event => { if (!event.isComposing) scheduleSuggestions(); });
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
    requestController?.abort();
    requestController = new AbortController();
    const controller = requestController;

    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ja&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Suggestion request failed');
        const data = await response.json();
        if (controller.signal.aborted || input.value.trim() !== query) return;
        suggestions = Array.isArray(data?.[1]) ? data[1].filter(item => typeof item === 'string').slice(0, 6) : [];
        renderSuggestions(input, list);
    } catch (error) {
        if (!controller.signal.aborted && error.name !== 'AbortError') clearSuggestions(input, list);
    }
}

function renderSuggestions(input, list) {
    activeIndex = -1;
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
