/* Assign the same system component to static and dynamically inserted controls. */
export function applyPasidea(root = document.body) {
    const all = selector => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    const add = (selector, classes) => all(selector).forEach(node => node.classList.add(...classes.split(' ')));
    add('button, a.primary-btn, a.tonal-btn, a.text-btn, .mini-file-label, .background-upload-btn', 'pasidea-interactive');
    add('.primary-btn, .secondary-btn, .tonal-btn, .ctrl-btn, .cc-control:not(.cc-icon), .search-button, .todo-input-wrapper > button', 'pasidea-btn');
    add('.secondary-btn, .tonal-btn, .ctrl-btn, .cc-secondary-button', 'pasidea-btn-secondary');
    add('.danger-btn, .cc-danger', 'pasidea-btn-danger');
    add('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), select, textarea', 'pasidea-input');
    add('.glass-card:not(.hero-section), .mini-app-card, .settings-section, .cc-flow-card, .clock-tool-card', 'pasidea-card');
    add('dialog, .settings-panel, .popup-modal-card, .help-modal-card, .weather-modal-content', 'pasidea-modal');
    add('.cloud-save-badge, .memo-save-status, .news-source-badge', 'pasidea-badge');
    add('.yt-thumbnail img, img.news-thumbnail, img.mini-thumbnail', 'pasidea-media');
    all('dialog').forEach(dialog => {
        if (dialog.hasAttribute('aria-label') || dialog.hasAttribute('aria-labelledby')) return;
        const title = dialog.querySelector('h1,h2');
        if (title) {
            title.id ||= `pasidea-dialog-title-${++titleSequence}`;
            dialog.setAttribute('aria-labelledby', title.id);
        }
    });
    all('button.close-action, button.cc-icon[data-cancel], button.cc-icon[data-cc=close], button[aria-label="閉じる"], button[aria-label$="を閉じる"]').forEach(button => {
        button.classList.add('pasidea-close-btn', 'pasidea-interactive');
        button.classList.remove('pasidea-btn');
        if (!button.querySelector('svg[data-pasidea-close]')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.dataset.pasideaClose = '';
            const path = document.createElementNS(svg.namespaceURI, 'path');
            path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
            svg.append(path);
            button.replaceChildren(svg);
        }
    });
}

let titleSequence = 0;
