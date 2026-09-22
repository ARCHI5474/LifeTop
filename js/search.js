let activeIndex = -1;
let suggestions = [];
let searchTimer;
let requestController;

export function initSearchSuggestions() {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    const form = document.getElementById('search-form');
    if (!input || !list || !form) return;

    input.addEventListener('input', () => {
        window.clearTimeout(searchTimer);
        const query = input.value.trim();
        if (!query) return clearSuggestions(input, list);
        searchTimer = window.setTimeout(() => fetchSuggestions(query, input, list), 180);
    });

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

    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ja&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { signal: requestController.signal });
        if (!response.ok) throw new Error('Suggestion request failed');
        const data = await response.json();
        if (input.value.trim() !== query) return;
        suggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 6) : [];
        renderSuggestions(input, list);
    } catch (error) {
        if (error.name !== 'AbortError') clearSuggestions(input, list);
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
        item.textContent = suggestion;
        item.addEventListener('mousedown', event => {
            event.preventDefault();
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
    if (event.isComposing) return;
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = event.key === 'ArrowDown'
            ? (activeIndex + 1) % suggestions.length
            : (activeIndex - 1 + suggestions.length) % suggestions.length;
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
