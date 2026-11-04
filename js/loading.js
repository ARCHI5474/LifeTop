/* Release the page as soon as initialization finishes; no artificial wait. */
export function initLoading() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return () => {};
    const restoredElements = [...document.body.children].filter(element => element !== screen && !element.inert && !element.matches('script'));
    restoredElements.forEach(element => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        screen.remove();
        restoredElements.forEach(element => { element.inert = false; });
        document.body.style.overflow = previousOverflow;
    };
}
