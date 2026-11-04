import { esc,download,fileText,printHTML,sanitizeDocument,canvasBlob } from './mini-common.js?v=1';
import { parseCSV,toCSV,evaluateCell,columnName } from './mini-model.js?v=1';

export function documentApp(ctx,state={}) {
    ctx.root.innerHTML=`<div class="mini-tools"><button class="tonal-btn" data-format="bold">太字</button><button class="tonal-btn" data-format="italic">斜体</button><button class="tonal-btn" data-format="insertUnorderedList">箇条書き</button><button class="tonal-btn" id="heading">見出し</button><button class="tonal-btn" id="table">表を挿入</button><label>テキストを読み込む<input id="text-file" type="file" accept=".txt,.md"></label><button class="tonal-btn" id="text-export">TXT保存</button><button class="tonal-btn" id="html-export">HTML保存</button><button class="primary-btn" id="print">印刷・PDF保存</button></div><p id="doc-count" class="mini-note"></p><div id="editor" class="mini-paper" contenteditable="true" role="textbox" aria-label="文書本文" aria-multiline="true"></div>`;
    const editor=ctx.$('#editor');editor.innerHTML=sanitizeDocument(state.html||'<h1>レポートのタイトル</h1><p>ここから書き始めましょう。</p>');
    const count=()=>ctx.$('#doc-count').textContent=`${Array.from(editor.innerText).length.toLocaleString()}文字 · 独自HTML/TXT形式。PDFは印刷画面から保存できます。`;
    editor.addEventListener('input',count);count();
    ctx.$$('.mini-tools button').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()));
    for(const button of ctx.$$('[data-format]'))button.addEventListener('click',()=>{editor.focus();document.execCommand(button.dataset.format);ctx.changed();});
    ctx.action('#heading',()=>{editor.focus();document.execCommand('formatBlock',false,'h2');ctx.changed();});
    ctx.action('#table',()=>{editor.focus();document.execCommand('insertHTML',false,'<table><tbody><tr><td>項目</td><td>内容</td></tr><tr><td> </td><td> </td></tr></tbody></table><p><br></p>');ctx.changed();});
    ctx.action('#text-file',async()=>{editor.textContent=await fileText(ctx.$('#text-file').files[0]);count();ctx.changed();},'change');
    editor.addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});
    ctx.action('#text-export',()=>download(editor.innerText,ctx.name()+'.txt'));
    ctx.action('#html-export',()=>download(`<!doctype html><meta charset="utf-8"><body>${sanitizeDocument(editor.innerHTML)}</body>`,ctx.name()+'.html','text/html'));
    ctx.action('#print',()=>printHTML(sanitizeDocument(editor.innerHTML),ctx.name()));
    return ()=>({html:sanitizeDocument(editor.innerHTML)});
}

export function sheetApp(ctx,state={}) {
    let grid=Array.isArray(state.grid)?state.grid.slice(0,200).map(row=>Array.isArray(row)?row.slice(0,32).map(v=>String(v).slice(0,5000)):[]):Array.from({length:20},()=>Array(8).fill(''));
    if(!grid.length)grid=[['']];let cols=Math.max(1,...grid.map(row=>row.length));grid=grid.map(row=>Array.from({length:cols},(_,c)=>row[c]||''));
    ctx.root.innerHTML=`<div class="mini-tools"><label>CSV読み込み<input id="csv" type="file" accept=".csv,text/csv"></label><button class="tonal-btn" id="row-add">行を追加</button><button class="tonal-btn" id="col-add">列を追加</button><button class="primary-btn" id="csv-export">CSV保存</button><button class="tonal-btn" id="to-chart">グラフにする</button></div><p class="mini-note">セルに =A1+B1、=SUM(A1:A5)、AVERAGE・MIN・MAX・COUNT。最大200行×32列。タブ区切りの貼り付けに対応。</p><div class="mini-scroll"><table class="mini-grid" id="grid"></table></div>`;
    const recalc=()=>{for(const output of ctx.$$('output')){const r=Number(output.dataset.r),c=Number(output.dataset.c);if(!grid[r][c].startsWith('=')){output.textContent='';continue;}try{output.textContent='→ '+Number(evaluateCell(grid,r,c).toPrecision(12));}catch(error){output.textContent='#ERROR '+error.message;}}};
    const render=()=>{ctx.$('#grid').innerHTML=`<thead><tr><th></th>${Array.from({length:cols},(_,c)=>`<th>${columnName(c)}</th>`).join('')}</tr></thead><tbody>${grid.map((row,r)=>`<tr><th>${r+1}</th>${row.map((value,c)=>`<td><input data-r="${r}" data-c="${c}" aria-label="${columnName(c)}${r+1}" value="${esc(value)}"><output data-r="${r}" data-c="${c}"></output></td>`).join('')}</tr>`).join('')}</tbody>`;recalc();};render();
    ctx.$('#grid').addEventListener('input',event=>{if(event.target.tagName!=='INPUT')return;grid[+event.target.dataset.r][+event.target.dataset.c]=event.target.value;recalc();});
    ctx.$('#grid').addEventListener('paste',event=>{if(event.target.tagName!=='INPUT')return;const text=event.clipboardData.getData('text/plain');if(!/[\t\n]/.test(text))return;event.preventDefault();const rows=text.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(row=>row.split('\t')),r0=+event.target.dataset.r,c0=+event.target.dataset.c;
        if(r0+rows.length>200||c0+Math.max(...rows.map(row=>row.length))>32){ctx.notify('貼り付け範囲が200行×32列を超えます。',true);return;}
        cols=Math.max(cols,c0+Math.max(...rows.map(row=>row.length)));while(grid.length<r0+rows.length)grid.push([]);grid=grid.map(row=>Array.from({length:cols},(_,c)=>row[c]||''));rows.forEach((row,r)=>row.forEach((v,c)=>grid[r0+r][c0+c]=v));render();ctx.changed();});
    ctx.action('#csv',async()=>{const rows=parseCSV(await fileText(ctx.$('#csv').files[0]));const width=Math.max(...rows.map(row=>row.length));if(rows.length>200||width>32)throw new Error('CSVは200行×32列までです。');cols=Math.max(1,width);grid=rows.map(row=>Array.from({length:cols},(_,c)=>row[c]||''));render();ctx.changed();},'change');
    ctx.action('#row-add',()=>{if(grid.length>=200)throw new Error('最大200行です。');grid.push(Array(cols).fill(''));render();ctx.changed();});
    ctx.action('#col-add',()=>{if(cols>=32)throw new Error('最大32列です。');cols++;grid.forEach(row=>row.push(''));render();ctx.changed();});
    ctx.action('#csv-export',()=>download(toCSV(grid),ctx.name()+'.csv','text/csv;charset=utf-8'));
    ctx.action('#to-chart',()=>ctx.send('data',{csv:toCSV(grid.map((row,r)=>row.map((v,c)=>v.startsWith('=')?String(evaluateCell(grid,r,c)):v)))}));
    return ()=>({grid});
}

export function slidesApp(ctx,state={}) {
    let slides=Array.isArray(state.slides)&&state.slides.length?state.slides.slice(0,100).map(s=>({title:String(s.title||''),body:String(s.body||''),bg:/^#[\da-f]{6}$/i.test(s.bg)?s.bg:'#173957'})):[{title:'発表のタイトル',body:'伝えたいことを、ここに。',bg:'#173957'}],index=0;
    ctx.root.innerHTML=`<div class="mini-tools"><button class="tonal-btn" id="slide-add">追加</button><button class="tonal-btn" id="slide-delete">削除</button><button class="tonal-btn" id="slide-left">前へ移動</button><button class="primary-btn" id="present">全画面で発表</button><button class="tonal-btn" id="slide-svg">このページをSVG保存</button><button class="tonal-btn" id="slide-print">全ページをPDF・印刷</button></div><div class="mini-slide-list" id="slide-list"></div><div class="mini-two"><div><label>タイトル<input id="slide-title" style="width:100%"></label><label>本文<textarea id="slide-body"></textarea></label><label>背景色<input id="slide-color" type="color"></label><p class="mini-note">発表中は左右キーで移動、Escで終了。独自作業形式で保存します。</p></div><div id="slide-preview" class="mini-slide" tabindex="0" aria-label="スライドプレビュー"><h2></h2><p></p></div></div>`;
    const update=()=>{const s=slides[index];s.title=ctx.$('#slide-title').value;s.body=ctx.$('#slide-body').value;s.bg=ctx.$('#slide-color').value;preview();};
    const preview=()=>{const s=slides[index],p=ctx.$('#slide-preview');p.style.setProperty('--slide-bg',s.bg);p.querySelector('h2').textContent=s.title;p.querySelector('p').textContent=s.body;};
    const render=()=>{const s=slides[index];ctx.$('#slide-title').value=s.title;ctx.$('#slide-body').value=s.body;ctx.$('#slide-color').value=s.bg;ctx.$('#slide-list').innerHTML=slides.map((_,i)=>`<button class="tonal-btn" data-slide="${i}" aria-pressed="${i===index}">${i+1}</button>`).join('');preview();};render();
    ctx.$('#slide-list').addEventListener('click',event=>{const b=event.target.closest('[data-slide]');if(b){index=+b.dataset.slide;render();}});
    ['#slide-title','#slide-body','#slide-color'].forEach(selector=>ctx.$(selector).addEventListener('input',update));
    ctx.action('#slide-add',()=>{if(slides.length>=100)throw new Error('最大100枚です。');slides.push({title:'新しいスライド',body:'',bg:'#173957'});index=slides.length-1;render();ctx.changed();});
    ctx.action('#slide-delete',()=>{if(slides.length===1)throw new Error('最後の1枚は削除できません。');slides.splice(index,1);index=Math.min(index,slides.length-1);render();ctx.changed();});
    ctx.action('#slide-left',()=>{if(index>0){[slides[index-1],slides[index]]=[slides[index],slides[index-1]];index--;render();ctx.changed();}});
    ctx.action('#present',async()=>{await ctx.$('#slide-preview').requestFullscreen();ctx.$('#slide-preview').focus();});
    ctx.$('#slide-preview').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();index=Math.max(0,Math.min(slides.length-1,index+(event.key==='ArrowRight'?1:-1)));render();});
    ctx.action('#slide-svg',()=>{const s=slides[index];download(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="${s.bg}"/><text x="100" y="180" fill="white" font-family="sans-serif" font-size="54">${esc(s.title)}</text>${s.body.split('\n').map((line,i)=>`<text x="100" y="${260+i*44}" fill="white" font-family="sans-serif" font-size="30">${esc(line)}</text>`).join('')}</svg>`,ctx.name()+`-${index+1}.svg`,'image/svg+xml');});
    ctx.action('#slide-print',()=>printHTML(slides.map(s=>`<section><h1>${esc(s.title)}</h1><pre>${esc(s.body)}</pre></section>`).join(''),ctx.name()));
    return ()=>({slides});
}
