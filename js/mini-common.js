export { escapeHTML as esc } from './mini-model.js?v=1';
export function download(data,name,type='text/plain;charset=utf-8') {
    const blob=data instanceof Blob?data:new Blob([data],{type});
    const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export const fileText = async file => { if(!file)throw new Error('ファイルを選んでください。');return file.text(); };
export async function pdfLibrary() {
    if(window.PDFLib)return window.PDFLib;
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='js/vendor/pdf-lib.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('PDFライブラリを読み込めませんでした。'));document.head.append(script);});
    return window.PDFLib;
}
export function canvasBlob(canvas,type='image/png',quality=.85) {return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を書き出せませんでした。')),type,quality));}
export function printHTML(html,title='LifeTop') {
    const frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);
    const doc=frame.contentDocument;doc.open();doc.write(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>${String(title).replace(/[<>&]/g,'')}</title><style>body{font:12pt/1.8 system-ui;padding:14mm;color:#17212b}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}img,svg{max-width:100%}section{break-after:page}h1{line-height:1.3}pre{white-space:pre-wrap}</style><body>${html}</body></html>`);doc.close();
    setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);},150);
}
export function sanitizeDocument(html) {
    const doc=new DOMParser().parseFromString(String(html),'text/html');
    const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','H1','H2','H3','UL','OL','LI','BLOCKQUOTE','TABLE','TBODY','TR','TD','TH','SPAN']);
    const clean=node=>{for(const child of [...node.children]) {if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG'].includes(child.tagName)){child.remove();continue;}clean(child);if(!allowed.has(child.tagName)){child.replaceWith(...child.childNodes);continue;}for(const attr of [...child.attributes])child.removeAttribute(attr.name);}};
    clean(doc.body);return doc.body.innerHTML;
}
export function makeContext(root,notify,changed,name) {
    const cleanup=[];let alive=true;
    const ctx={root,$:selector=>root.querySelector(selector),$$:selector=>[...root.querySelectorAll(selector)],notify,changed,name,
        onDispose:fn=>cleanup.push(fn),get alive(){return alive;},
        url(blob){const url=URL.createObjectURL(blob);cleanup.push(()=>URL.revokeObjectURL(url));return url;},
        action(selector,fn,event='click'){root.querySelector(selector).addEventListener(event,async e=>{const button=e.currentTarget;try{if(event==='click')button.disabled=true;await fn(e);}catch(error){if(alive)notify(error.message||'処理できませんでした。',true);}finally{if(event==='click'&&button.isConnected)button.disabled=button.dataset.busy==='true';}});},
        dispose(){alive=false;for(const fn of cleanup.reverse()){try{fn();}catch{}}}
    };return ctx;
}
