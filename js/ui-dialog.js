export function openUIDialog(dialog, {onRequestClose = () => true} = {}) {
    const trigger = document.activeElement;
    const origin = trigger?.dataset?.cc ? {action: trigger.dataset.cc, id: trigger.dataset.id || ''} : null;
    let closeRequest = null;
    function requestClose() {
        if (closeRequest) return closeRequest;
        if (!dialog.open) return Promise.resolve();
        closeRequest = Promise.resolve().then(async () => {
            if (!await onRequestClose()) return;
            dialog.dataset.state = 'closing';
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
            const exitDuration = reduced ? 0 : parseFloat(getComputedStyle(dialog).getPropertyValue('--ui-duration-fast')) || 0;
            await new Promise(resolve => setTimeout(resolve, exitDuration));
            if (dialog.open) await new Promise(resolve => {
                dialog.addEventListener('close', resolve, {once:true});
                dialog.close();
            });
        }).finally(() => { closeRequest = null; });
        return closeRequest;
    }
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll('iframe,a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(n => n.getClientRects().length && n.tabIndex >= 0);
        if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('cancel', event => {event.preventDefault(); void requestClose();});
    dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog.ui-scope[open]')) document.body.classList.remove('ui-modal-open');
        const scope = document.querySelector('dialog.ui-scope[open]') || document;
        const replacement = origin && [...scope.querySelectorAll('[data-cc]')].find(n => n.dataset.cc === origin.action && (n.dataset.id || '') === origin.id && n.getClientRects().length);
        if (trigger?.isConnected) trigger.focus();
        else replacement?.focus();
        dialog.remove();
    });
    dialog.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => void requestClose()));
    document.body.classList.add('ui-modal-open');
    dialog.dataset.state = 'open';
    dialog.showModal();
    dialog.querySelector('.cc-form-fields input:not([type=checkbox]), .cc-form-fields textarea, .cc-form-fields select')?.focus();
    return {close: requestClose};
}
