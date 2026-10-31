const BRANDS = /\b(Google|LifeTop)\b/;
const SKIP = 'script, style, title, textarea, select, option, [contenteditable], .brand-word, .material-symbols-outlined';

// Wrap text nodes, never HTML, attributes or user-editable content.
export function protectBrandWords(root) {
    const nodes=[];
    if(root.nodeType===Node.TEXT_NODE)nodes.push(root);
    else {
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        while(walker.nextNode())nodes.push(walker.currentNode);
    }
    for(const node of nodes){
        if(!node.parentElement || node.parentElement.closest(SKIP) || !BRANDS.test(node.textContent))continue;
        const fragment=document.createDocumentFragment();
        // Keep one text wrapper so flex buttons do not insert their gap
        // between a brand name and its surrounding Japanese text.
        const copy=document.createElement('span');copy.className='brand-copy';
        for(const part of node.textContent.split(BRANDS)){
            if(part==='Google'||part==='LifeTop'){
                const word=document.createElement('span');word.className='brand-word';word.textContent=part;copy.append(word);
            }else copy.append(document.createTextNode(part));
        }
        fragment.append(copy);
        node.replaceWith(fragment);
    }
}

export function initResponsiveUI() {
    let frame=null;
    const update=()=>{
        frame=null;
        const viewport=window.visualViewport;
        document.documentElement.style.setProperty('--visual-height',`${viewport?.height ?? window.innerHeight}px`);
        document.documentElement.style.setProperty('--visual-top',`${viewport?.offsetTop ?? 0}px`);
    };
    const schedule=()=>{if(frame===null)frame=requestAnimationFrame(update);};
    window.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
    update();
    protectBrandWords(document.body);
    new MutationObserver(records=>{
        for(const record of records){
            if(record.type==='characterData')protectBrandWords(record.target);
            else for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE||node.nodeType===Node.TEXT_NODE)protectBrandWords(node);
        }
    }).observe(document.body,{subtree:true,childList:true,characterData:true});
}
