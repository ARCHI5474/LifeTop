import {download,canvasBlob} from './mini-common.js?v=1';
import {parseCSV,toCSV} from './mini-model.js?v=1';

const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function diaryApp(ctx,state={}) {
    const entries=Object.fromEntries(Object.entries(state.entries||{}).filter(([date,text])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&typeof text==='string'));
    let selected=/^\d{4}-\d{2}-\d{2}$/.test(state.selected)?state.selected:today();
    ctx.root.innerHTML='<div class="mini-tools"><label>日付<input id="diary-date" type="date"></label><button id="diary-today" class="tonal-btn">今日</button><button id="diary-export" class="tonal-btn">日記を書き出す</button></div><div class="studio-diary"><nav id="diary-list" aria-label="記録した日付"></nav><label>今日のできごと<textarea id="diary-text" rows="16" placeholder="思いついたことから、少しずつ。"></textarea></label></div>';
    const renderList=()=>{ctx.$('#diary-list').replaceChildren();for(const date of Object.keys(entries).filter(d=>entries[d].trim()).sort().reverse()){const button=document.createElement('button');button.type='button';button.className='tonal-btn';button.textContent=date;button.setAttribute('aria-pressed',String(date===selected));button.onclick=()=>{stash();select(date);ctx.changed();};ctx.$('#diary-list').append(button);}};
    const stash=()=>{entries[selected]=ctx.$('#diary-text').value;};
    const select=date=>{selected=date;ctx.$('#diary-date').value=date;ctx.$('#diary-text').value=entries[date]||'';renderList();};
    ctx.action('#diary-date',()=>{const date=ctx.$('#diary-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ctx.$('#diary-date').value=selected;return;}stash();select(date);},'change');
    ctx.action('#diary-today',()=>{stash();select(today());ctx.changed();});
    ctx.$('#diary-text').addEventListener('input',()=>{stash();renderList();});
    ctx.action('#diary-export',()=>{stash();download(Object.keys(entries).sort().map(date=>`# ${date}\n\n${entries[date]}`).join('\n\n'),ctx.name()+'.md','text/markdown;charset=utf-8');});
    select(selected);return ()=>{stash();return {entries,selected};};
}

export function convertApp(ctx,state={}) {
    ctx.root.innerHTML='<div class="mini-tools"><label>元ファイル<input id="convert-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.csv,.json"></label><label>出力形式<select id="convert-format"><optgroup label="画像"><option value="png">PNG</option><option value="jpg">JPEG</option><option value="webp">WebP</option></optgroup><optgroup label="テキスト・データ"><option value="txt">TXT（UTF-8）</option><option value="md">Markdown（UTF-8）</option><option value="json">JSON</option><option value="csv">CSV</option></optgroup></select></label><button id="convert-run" class="primary-btn">変換して保存</button></div><p class="mini-note">画像は再エンコード、テキストはUTF-8で出力します。CSVとJSONは表データを相互変換できます。画像のアニメーションは先頭フレームになります。</p><p id="convert-result" role="status"></p>';
    const format=ctx.$('#convert-format');if(['png','jpg','webp','txt','md','json','csv'].includes(state.format))format.value=state.format;
    ctx.action('#convert-run',async()=>{
        const file=ctx.$('#convert-file').files[0];if(!file)throw Error('元ファイルを選んでください。');
        if(file.size>30*1024**2)throw Error('30MB以下のファイルを選んでください。');
        const target=format.value,name=file.name.replace(/\.[^.]+$/,'');let output,type;
        if(['png','jpg','webp'].includes(target)) {
            if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('画像ファイルからPNG・JPEG・WebPに変換できます。');
            const bitmap=await createImageBitmap(file);
            try {if(bitmap.width*bitmap.height>40_000_000)throw Error('画像は4000万画素以内で選んでください。');const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const g=canvas.getContext('2d');if(target==='jpg'){g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);}g.drawImage(bitmap,0,0);type='image/'+(target==='jpg'?'jpeg':target);output=await canvasBlob(canvas,type,.9);if(output.type!==type)throw Error('このブラウザでは指定形式に変換できません。');}finally{bitmap.close();}
        } else {
            if(!/\.(txt|md|csv|json)$/i.test(file.name))throw Error('TXT・Markdown・CSV・JSONファイルを選んでください。');
            const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
            if(target==='json'){output=JSON.stringify(/\.csv$/i.test(file.name)?parseCSV(text):JSON.parse(text),null,2);type='application/json';}
            else if(target==='csv'){let rows;if(/\.json$/i.test(file.name)){const data=JSON.parse(text);if(!Array.isArray(data))throw Error('CSV変換には行の配列が必要です。');if(data.every(Array.isArray))rows=data;else if(data.every(item=>item&&typeof item==='object'&&!Array.isArray(item))){const keys=[...new Set(data.flatMap(Object.keys))];rows=[keys,...data.map(item=>keys.map(key=>typeof item[key]==='object'?JSON.stringify(item[key]):item[key]??''))];}else throw Error('JSONは配列の配列、またはオブジェクトの配列にしてください。');}else rows=parseCSV(text);output=toCSV(rows);type='text/csv;charset=utf-8';}
            else {output=text;type=target==='md'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8';}
        }
        if(!ctx.alive)return;download(output,name+'.'+target,type);ctx.$('#convert-result').textContent=`${name}.${target} を書き出しました。`;
    });
    return ()=>({format:format.value});
}

function webURL(value) {const text=String(value).trim();const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(text)?text:'https://'+text);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('HTTPまたはHTTPSのURLを入力してください。');return url.href;}
export function browserApp(ctx,state={}) {
    let current='',visits=[],index=-1;
    ctx.root.innerHTML='<form id="browser-form" class="mini-tools"><button id="browser-back" type="button" class="tonal-btn" aria-label="前のURL">←</button><button id="browser-next" type="button" class="tonal-btn" aria-label="次のURL">→</button><label class="studio-address">URL<input id="browser-address" type="text" inputmode="url" placeholder="https://example.com" autocomplete="off"></label><button class="primary-btn" type="submit">開く</button><a id="browser-external" class="tonal-btn" target="_blank" rel="noopener noreferrer" hidden>新しいタブで開く</a></form><p class="mini-note">β版：サイト側の制限で表示できないページは「新しいタブで開く」を使用してください。戻る・進むは、このURL欄から開いた履歴が対象です。</p><p id="browser-status" role="status">URLを入力してください。</p><iframe id="studio-browser-frame" class="studio-browser-frame" title="PaisdeaBrowserのWebページ" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"></iframe>';
    const navigate=(value,add=true)=>{const url=webURL(value);current=url;if(add){visits=visits.slice(0,index+1);visits.push(url);index=visits.length-1;}ctx.$('#browser-address').value=url;ctx.$('#studio-browser-frame').src=url;const link=ctx.$('#browser-external');link.href=url;link.hidden=false;ctx.$('#browser-back').disabled=index<=0;ctx.$('#browser-next').disabled=index>=visits.length-1;ctx.$('#browser-status').textContent='ページの読み込みを要求しました。表示できない場合は新しいタブで開いてください。';ctx.changed();};
    ctx.$('#browser-form').addEventListener('submit',event=>{event.preventDefault();try{navigate(ctx.$('#browser-address').value);}catch(error){ctx.notify(error.message,true);}});
    ctx.$('#browser-back').addEventListener('click',()=>{if(index>0)navigate(visits[--index],false);});ctx.$('#browser-next').addEventListener('click',()=>{if(index<visits.length-1)navigate(visits[++index],false);});
    ctx.$('#browser-back').disabled=ctx.$('#browser-next').disabled=true;
    if(state.url){try{ctx.$('#browser-address').value=webURL(state.url);current=webURL(state.url);}catch{}}
    ctx.onDispose(()=>ctx.$('#studio-browser-frame')?.remove());return ()=>({url:current});
}

export function codeApp(ctx,state={}) {
    const languages={html:['HTML','.html','text/html'],css:['CSS','.css','text/css'],js:['JavaScript','.js','text/javascript'],json:['JSON','.json','application/json'],txt:['Text','.txt','text/plain']};
    ctx.root.innerHTML=`<div class="mini-tools"><label>言語<select id="code-language">${Object.entries(languages).map(([key,[label]])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>読み込む<input id="code-file" type="file" accept=".html,.css,.js,.json,.txt,.md"></label><button id="code-export" class="primary-btn">コードを書き出す</button><button id="code-format" class="tonal-btn">JSONを整形</button><button id="code-preview-button" class="tonal-btn">HTMLをプレビュー</button></div><label>コード<textarea id="code-source" class="studio-code-source" rows="20" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="code-info"></textarea></label><p id="code-info" class="mini-note"></p><iframe id="code-preview" class="studio-browser-frame" title="コードのプレビュー" sandbox="allow-scripts" hidden></iframe>`;
    const language=ctx.$('#code-language'),source=ctx.$('#code-source');language.value=Object.hasOwn(languages,state.language)?state.language:'html';source.value=typeof state.source==='string'?state.source:'<!doctype html>\n<html lang="ja">\n<meta charset="utf-8">\n<h1>Hello, PasideaCode!</h1>\n</html>';
    const info=()=>{ctx.$('#code-info').textContent=`${source.value.split('\n').length}行 · ${source.value.length.toLocaleString()}文字。プレビューは独立した領域で実行し、外部の画像・スクリプト読込やfetchを制限します。`;ctx.$('#code-format').disabled=language.value!=='json';ctx.$('#code-preview-button').disabled=language.value!=='html';};
    source.addEventListener('input',info);language.addEventListener('change',()=>{ctx.$('#code-preview').hidden=true;ctx.$('#code-preview').srcdoc='';info();});
    source.addEventListener('keydown',event=>{if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();source.setRangeText('  ',source.selectionStart,source.selectionEnd,'end');info();ctx.changed();}});
    ctx.action('#code-file',async()=>{const file=ctx.$('#code-file').files[0];if(!file)return;if(file.size>2*1024**2)throw Error('コードは2MB以下で選んでください。');const text=await file.text();if(!ctx.alive)return;source.value=text;const extension=file.name.split('.').at(-1);language.value=Object.hasOwn(languages,extension)?extension:'txt';info();ctx.changed();},'change');
    ctx.action('#code-export',()=>{const [,extension,type]=languages[language.value];download(source.value,ctx.name()+extension,type+';charset=utf-8');});
    ctx.action('#code-format',()=>{source.value=JSON.stringify(JSON.parse(source.value),null,2);info();ctx.changed();});
    ctx.action('#code-preview-button',()=>{const frame=ctx.$('#code-preview');frame.hidden=false;frame.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">${source.value}`;});
    ctx.onDispose(()=>ctx.$('#code-preview')?.remove());info();return ()=>({language:language.value,source:source.value});
}
