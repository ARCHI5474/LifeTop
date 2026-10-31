import assert from 'node:assert/strict';
import {protectBrandWords,initResponsiveUI} from '../js/responsive-ui.js?v=8.0';
globalThis.Node={ELEMENT_NODE:1,TEXT_NODE:3};globalThis.NodeFilter={SHOW_TEXT:4};
class Text {
    nodeType=3;
    constructor(text){this.textContent=text;}
    replaceWith(fragment){const parent=this.parentElement;const index=parent.children.indexOf(this);parent.children.splice(index,1,...fragment.children);for(const child of fragment.children)child.parentElement=parent;}
}
class Element {
    nodeType=1;children=[];className='';editable=false;
    constructor(tag='div'){this.tag=tag;}
    get textContent(){return this.children.map(child=>child.textContent).join('');}
    set textContent(value){this.children=[];this.append(new Text(value));}
    append(child){this.children.push(child);child.parentElement=this;}
    closest(){let p=this;while(p){if(['script','style','title','textarea','select','option'].includes(p.tag)||p.editable||p.className==='brand-word'||p.className==='material-symbols-outlined')return p;p=p.parentElement;}return null;}
}
const body=new Element('body');
const heading=new Element('h2');heading.textContent='Googleで、いつものLifeTopを';body.append(heading);
const editor=new Element();editor.editable=true;editor.textContent='Google LifeTop <b>メモ</b>';body.append(editor);
const script=new Element('script');script.textContent='Google LifeTop';body.append(script);
const styles=new Map(),listeners={},viewportListeners={},frames=[];
globalThis.document={body,documentElement:{style:{setProperty:(k,v)=>styles.set(k,v)}},
    createElement:tag=>new Element(tag),createTextNode:text=>new Text(text),createDocumentFragment:()=>new Element(),
    createTreeWalker(root){
        const nodes=[];
        const visit=node=>{if(node.nodeType===3)nodes.push(node);else node.children.forEach(visit);};
        visit(root);let i=-1;
        return{nextNode(){return !!nodes[++i];},get currentNode(){return nodes[i];}};
    }
};
globalThis.window={innerHeight:900,addEventListener:(name,fn)=>listeners[name]=fn,
    visualViewport:{height:800,offsetTop:0,addEventListener:(name,fn)=>viewportListeners[name]=fn}};
globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
globalThis.MutationObserver=class{observe(){}};
protectBrandWords(body);
assert.equal(heading.textContent,'Googleで、いつものLifeTopを');
assert.equal(heading.children.length,1,'brand wrapping must not introduce multiple flex items or extra gaps');
assert.deepEqual(heading.children[0].children.filter(child=>child.className==='brand-word').map(child=>child.textContent),['Google','LifeTop']);
assert.equal(editor.children.length,1,'editable content must keep its original DOM and caret');
assert.equal(script.children.length,1,'scripts must never be rewritten');
const count=heading.children.length;protectBrandWords(body);assert.equal(heading.children.length,count,'wrapping twice does not nest brand spans');
initResponsiveUI();assert.equal(styles.get('--visual-height'),'800px');
window.visualViewport.height=360;window.visualViewport.offsetTop=100;
viewportListeners.resize();viewportListeners.scroll();assert.equal(frames.length,1,'keyboard viewport events share one animation frame');
frames[0]();assert.equal(styles.get('--visual-height'),'360px');assert.equal(styles.get('--visual-top'),'100px');
console.log('PASS: intact brand names, editable content safety, idempotent wrapping and soft-keyboard viewport updates');
