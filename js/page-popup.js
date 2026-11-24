import {openUIDialog} from './ui-dialog.js?v=14.0.0';

// Internal destinations stay in the home context and share one dialog shell.
export function openPagePopup(path, title) {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin || !['/messages.html', '/festival.html'].some(p => url.pathname.endsWith(p))) return;
    const id = url.pathname.endsWith('/messages.html') ? 'messages-dialog' : 'festival-dialog';
    const existing = document.getElementById(id);
    if (existing) { existing.querySelector('button')?.focus(); return; }
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = 'cc-dialog pasidea-app-popup ui-scope';
    dialog.setAttribute('aria-labelledby', id + '-title');
    const header = document.createElement('header');
    header.className = 'pasidea-popup-header';
    const heading = document.createElement('h2');
    heading.id = id + '-title';
    heading.className = 'pasidea-title';
    heading.textContent = title;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'cc-control cc-icon';
    close.dataset.cancel = '';
    close.setAttribute('aria-label', '閉じる');
    header.append(heading, close);
    const frame = document.createElement('iframe');
    frame.title = title;
    if (id === 'messages-dialog') frame.allow = 'microphone; display-capture';
    url.searchParams.set('embedded', '1');
    frame.src = url.href;
    dialog.append(header, frame);
    document.body.append(dialog);
    const lifecycle = openUIDialog(dialog);
    frame.addEventListener('load', () => frame.contentDocument?.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !e.isComposing && !e.defaultPrevented && !frame.contentDocument.querySelector('dialog[open]')) {
            e.preventDefault();
            void lifecycle.close();
        }
    }));
    return lifecycle;
}
