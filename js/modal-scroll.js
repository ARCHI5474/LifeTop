// Cover native dialogs and legacy overlay panels, including nested modals.
export function initModalScroll() {
    let locked = false, y = 0, previous;
    const sync = () => {
        const open = !!document.querySelector('dialog[open],.settings-panel.active,.popup-modal.active,.help-modal.active,.weather-modal.active,.game-modal.active');
        if (open === locked) return;
        locked = open;
        if (open) {
            y = window.scrollY;
            previous = ['position','top','width','overflow'].map(key => document.body.style[key]);
            Object.assign(document.body.style, {position:'fixed',top:`-${y}px`,width:'100%',overflow:'hidden'});
        } else {
            ['position','top','width','overflow'].forEach((key,i) => document.body.style[key] = previous[i]);
            window.scrollTo({top:y,behavior:'instant'});
        }
    };
    new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});
    sync();
}
