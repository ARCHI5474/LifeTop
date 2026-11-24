import {applyPasidea} from './pasidea.js?v=14.0.0';

export function openUIDialog(dialog, {onRequestClose = () => true} = {}) {
    applyPasidea(dialog);
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
        if (event.key !== 'Tab' || event.defaultPrevented || event.target.closest('dialog[open]') !== dialog) return;
        const controls = [...dialog.querySelectorAll('iframe,a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(n => n.getClientRects().length && n.tabIndex >= 0);
        if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('cancel', event => {event.preventDefault(); if (!event.isComposing) void requestClose();});
    dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog.ui-scope[open]')) document.body.classList.remove('ui-modal-open');
        const scope = [...document.querySelectorAll('dialog[open]')].at(-1) || document;
        const replacement = origin && [...scope.querySelectorAll('[data-cc]')].find(n => n.dataset.cc === origin.action && (n.dataset.id || '') === origin.id && n.getClientRects().length);
        if (trigger?.isConnected && trigger.getClientRects().length && !trigger.closest('[inert]') && (scope === document || scope.contains(trigger))) trigger.focus({preventScroll:true});
        else (replacement || scope.querySelector('button:not(:disabled),input:not(:disabled),[tabindex="0"]'))?.focus({preventScroll:true});
        dialog.remove();
    });
    dialog.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => void requestClose()));
    document.body.classList.add('ui-modal-open');
    dialog.dataset.state = 'open';
    dialog.showModal();
    dialog.querySelector('.cc-form-fields input:not([type=checkbox]), .cc-form-fields textarea, .cc-form-fields select')?.focus();
    return {close: requestClose};
}

let decisionSequence = 0;

/** Present a confirmation or a single-field choice with the shared dialog lifecycle. */
export function requestDecision(message, {title = '確認', acceptLabel = '続ける', variant = 'primary', field, choices} = {}) {
    return new Promise(resolve => {
        const id = 'ui-decision-' + ++decisionSequence;
        const dialog = document.createElement('dialog');
        dialog.className = 'cc-dialog ui-scope ui-decision';
        dialog.setAttribute('aria-labelledby', id);
        dialog.setAttribute('aria-describedby', id + '-message');
        dialog.innerHTML = '<form><header class="pasidea-popup-header"><h2></h2></header><div class="ui-decision-body"><p></p><div class="mini-tools"><button type="button" class="text-btn" data-cancel autofocus>キャンセル</button><button type="submit" class="primary-btn"></button></div></div></form>';
        const heading = dialog.querySelector('h2');
        const description = dialog.querySelector('p');
        heading.id = id;
        heading.textContent = title;
        description.id = id + '-message';
        description.textContent = message;
        const accept = dialog.querySelector('[type=submit]');
        accept.className = variant === 'danger' ? 'danger-btn' : 'primary-btn';
        accept.textContent = acceptLabel;
        let input;
        if (field || choices) {
            const label = document.createElement('label');
            label.textContent = choices ? '移動先' : field.label;
            input = document.createElement(choices ? 'select' : 'input');
            input.required = true;
            if (choices) {
                for (const choice of choices) input.add(new Option(choice.label, choice.value));
            } else {
                input.value = field.value;
                input.maxLength = field.maxLength;
            }
            label.append(input);
            description.after(label);
        }
        let result = null;
        document.body.append(dialog);
        const lifecycle = openUIDialog(dialog);
        dialog.addEventListener('close', () => resolve(result), {once:true});
        dialog.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            result = input ? input.value : true;
            void lifecycle.close();
        });
        input?.focus();
    });
}
