import {openUIDialog} from './ui-dialog.js';

export function openFestival() {
    if (document.getElementById('festival-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'festival-dialog';
    dialog.className = 'cc-dialog mini-popup ui-scope';
    dialog.setAttribute('aria-label', 'LifeTop v10.0 Festival');
    dialog.innerHTML = '<header class="mini-popup-header"><h2>LifeTop v10.0 Festival</h2><button type="button" class="cc-control" data-cancel aria-label="Festivalを閉じる">×</button></header><iframe title="Festival会場" src="festival.html?embedded=1"></iframe>';
    document.body.append(dialog);
    const lifecycle = openUIDialog(dialog);
    dialog.querySelector('iframe').addEventListener('load', event => {
        event.target.contentDocument?.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !e.isComposing && e.keyCode !== 229 && !e.defaultPrevented) { e.preventDefault(); void lifecycle.close(); }
        });
    });
}
