/* One input-independent feedback layer. Never delays the control's action. */
export function initMotion() {
    initSelectionIndicators();
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => preference.matches || document.documentElement.classList.contains('reduce-motion');
    const presses = new Map();
    const running = new Map();
    const targetFor = target => {
        if (!(target instanceof Element)) return null;
        if (target.closest('.puzzle-board, .othello-board, .extra-board, [contenteditable]')) return null;
        const control = target.closest('button, a.bookmark-item, .background-upload-btn, .choice-option, .switch');
        if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.querySelector('input:disabled')) return null;
        return control.matches('.choice-option') ? control.querySelector('.choice-content') : control.matches('.switch') ? control.querySelector('.slider') : control;
    };
    const animate = (element, frames, options) => {
        const currentScale = getComputedStyle(element).scale;
        running.get(element)?.cancel();
        running.delete(element);
        if (reduced() || !element.isConnected) return;
        frames[0] = { ...frames[0], scale: currentScale === 'none' ? '1' : currentScale };
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

/* A shared background moves independently of the labels and press feedback. */
function initSelectionIndicators() {
    const selector = '.utility-tabs, .news-tabs, .bookmark-tabs, .clock-tool-switch, .game-selector-tabs, .game-segmented, .bm-dialog-mode-tabs, .settings-category-tabs';
    const groups = new Set();
    let pending = false;
    const update = () => {
        pending = false;
        document.querySelectorAll(selector).forEach(group => {
            if (!groups.has(group)) {
                groups.add(group);
                group.classList.add('sliding-selection');
                resize.observe(group);
            }
            const active = [...group.children].find(child => child.matches('button.active'));
            if (!active || !active.getClientRects().length) {
                group.classList.remove('selection-ready');
                return;
            }
            const x = active.offsetLeft;
            const y = active.offsetTop;
            group.style.setProperty('--selection-x', `${x}px`);
            group.style.setProperty('--selection-y', `${y}px`);
            group.style.setProperty('--selection-width', `${active.offsetWidth}px`);
            group.style.setProperty('--selection-height', `${active.offsetHeight}px`);
            // Commit the first position without animating from the origin.
            if (!group.classList.contains('selection-ready')) {
                group.getBoundingClientRect();
                group.classList.add('selection-ready');
            }
        });
        groups.forEach(group => {
            if (!group.isConnected) { resize.unobserve(group); groups.delete(group); }
        });
    };
    const schedule = () => {
        if (!pending) { pending = true; requestAnimationFrame(update); }
    };
    const resize = new ResizeObserver(schedule);
    new MutationObserver(records => {
        // Ignore clock ticks, game board updates and our own marker classes.
        // Only selection controls or ancestors affecting their layout matter.
        if (records.some(record => {
            const target = record.target;
            if (!(target instanceof Element)) return false;
            if (record.type === 'attributes' && target.matches(selector)) return false;
            return !!target.closest(selector) || !!target.querySelector(selector);
        })) schedule();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', schedule, { passive: true });
    document.fonts.ready.then(schedule);
    update();
}
