/* A five-second brand sequence, measured after the loading surface can paint. */
export function initLoading() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return () => {};
    const minimumDuration = 5000;
    const restoredElements = [...document.body.children].filter(element => element !== screen && !element.inert && !element.matches('script'));
    restoredElements.forEach(element => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let ready = false;
    let started = null;
    let scheduled = false;
    const dismiss = () => {
        if (!ready || started === null || scheduled) return;
        scheduled = true;
        window.setTimeout(() => {
            screen.setAttribute('aria-label', 'LifeTopの準備ができました');
            const label = screen.querySelector('.loading-label');
            if (label) label.textContent = '準備ができました';
            screen.classList.add('is-hidden');
            const reduced = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.setTimeout(() => {
                screen.remove();
                restoredElements.forEach(element => { element.inert = false; });
                document.body.style.overflow = previousOverflow;
            }, reduced ? 0 : 440);
        }, Math.max(0, Math.ceil(minimumDuration - (performance.now() - started))));
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
        started = performance.now();
        dismiss();
    }));
    return () => { ready = true; dismiss(); };
}
