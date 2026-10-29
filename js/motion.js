/* One input-independent feedback layer. Never delays the control's action. */
export function initMotion() {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => preference.matches || document.documentElement.classList.contains('reduce-motion');
    const presses = new Map();
    const running = new Map();
    const targetFor = target => {
        if (target.closest('.puzzle-board, .othello-board, .extra-board, [contenteditable]')) return null;
        const control = target.closest('button, a.bookmark-item, .background-upload-btn, .choice-option, .switch');
        if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.querySelector('input:disabled')) return null;
        return control.matches('.choice-option') ? control.querySelector('.choice-content') : control.matches('.switch') ? control.querySelector('.slider') : control;
    };
    const animate = (element, frames, options) => {
        running.get(element)?.cancel();
        if (reduced() || !element.isConnected) return;
        const animation = element.animate(frames, options);
        running.set(element, animation);
        animation.finished.then(() => {
            if (options.fill !== 'forwards' && running.get(element) === animation) running.delete(element);
        }).catch(() => {});
    };
    const release = (element, bounce) => {
        animate(element, bounce ? [
            { scale: '.97 .95', offset: 0 },
            { scale: '1.025 1.015', offset: .5 },
            { scale: '.997 .998', offset: .78 },
            { scale: '1', offset: 1 }
        ] : [{ scale: getComputedStyle(element).scale }, { scale: '1' }],
        { duration: bounce ? 340 : 120, easing: 'cubic-bezier(.2,.7,.3,1)' });
    };
    document.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || reduced()) return;
        const element = targetFor(event.target);
        if (!element) return;
        presses.set(event.pointerId, { element, x: event.clientX, y: event.clientY });
        animate(element, [{ scale: '1' }, { scale: '.97 .95' }], { duration: 90, fill: 'forwards', easing: 'ease-out' });
    }, { passive: true });
    document.addEventListener('pointermove', event => {
        const press = presses.get(event.pointerId);
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
            presses.delete(event.pointerId);
            release(press.element, false);
        }
    }, { passive: true });
    const finish = event => {
        const press = presses.get(event.pointerId);
        if (!press) return;
        presses.delete(event.pointerId);
        release(press.element, event.type === 'pointerup' && targetFor(event.target) === press.element);
    };
    document.addEventListener('pointerup', finish, { passive: true });
    document.addEventListener('pointercancel', finish, { passive: true });
    document.addEventListener('click', event => {
        if (event.detail !== 0 || reduced()) return;
        const element = targetFor(event.target);
        if (element) release(element, true);
    }, true);
    const reset = () => {
        if (!reduced()) return;
        running.forEach(animation => animation.cancel());
        running.clear();
        presses.clear();
    };
    preference.addEventListener('change', reset);
    new MutationObserver(reset).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('blur', () => {
        presses.forEach(({ element }) => release(element, false));
        presses.clear();
    });
}
