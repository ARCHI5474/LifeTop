import {quickLinks} from './quick-links-data.js?v=14.0.0';
import {userConfig} from './config.js?v=14.0.0';
import {save} from './storage.js?v=14.0.0';
import {openUIDialog} from './ui-dialog.js?v=14.0.0';

const key = value => new URL(value).href.replace(/\/$/,'');
export function isQuickLinkPinned(item) {
    return (userConfig.bookmarks || []).flatMap(b => b.type === 'folder' ? b.children || [] : [b])
        .some(b => { try { return key(b.url) === key(item.url); } catch { return false; } });
}
export function pinQuickLink(item) {
    if (!quickLinks.includes(item)) throw Error('登録されていないリンクです。');
    if (isQuickLinkPinned(item)) return false;
    const previous = userConfig.bookmarks;
    userConfig.bookmarks = [...(previous || []), {title:item.title, url:item.url}];
    if (!save()) { userConfig.bookmarks = previous; throw Error('保存できませんでした。空き容量やブラウザの保存設定を確認してください。'); }
    document.dispatchEvent(new Event('lifetop:quick-link-pinned'));
    return true;
}
export function searchQuickLinks(query = '', category = '') {
    const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return quickLinks.filter(item => (!category || item.category === category) && terms.every(term =>
        `${item.title} ${item.url} ${item.category} ${item.kind}`.normalize('NFKC').toLocaleLowerCase().includes(term)));
}
export function openQuickLinks(category = '') {
    if(document.getElementById('quick-links-dialog'))return;
    const dialog=document.createElement('dialog');
    dialog.id='quick-links-dialog';dialog.className='cc-dialog v12-dialog quick-links-dialog ui-scope';
    dialog.setAttribute('aria-labelledby','quick-links-title');
    dialog.innerHTML='<header class="v12-dialog-header"><div><h2 id="quick-links-title">Quickアクセス</h2><p>1000件を検索・ピン留め</p></div><button type="button" class="cc-control cc-icon" data-cancel aria-label="Quickアクセスを閉じる"></button></header><div class="quick-link-filters"><label>サイト名・キーワード<input type="search" id="quick-link-query" placeholder="例：写真、Google、学習" autocomplete="off"></label><label>カテゴリ<select id="quick-link-category"><option value="">すべてのカテゴリ</option></select></label></div><p id="quick-link-count" role="status" aria-live="polite"></p><p class="v12-caption">各サイトは新しいタブで開きます。</p><div id="quick-link-results" class="quick-link-results"></div><footer class="v12-dialog-footer"><button type="button" class="tonal-btn" id="quick-link-more">次の50件を表示</button><p id="quick-link-status" role="status" aria-live="polite"></p></footer>';
    const select=dialog.querySelector('select'),query=dialog.querySelector('input');
    for(const name of new Set(quickLinks.map(item=>item.category)))select.add(new Option(name,name));
    select.value=category;let limit=50;
    const results=dialog.querySelector('#quick-link-results'),status=dialog.querySelector('#quick-link-status');
    function render(){
        const items=searchQuickLinks(query.value,select.value);
        dialog.querySelector('#quick-link-count').textContent=`${items.length}件中 ${Math.min(limit,items.length)}件を表示`;
        results.replaceChildren();
        for(const item of items.slice(0,limit)){
            const row=document.createElement('article');row.className='quick-link-row';
            const copy=document.createElement('div'),link=document.createElement('a'),meta=document.createElement('small');
            link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title;
            meta.textContent=`${item.category} · ${item.kind} · ${new URL(item.url).hostname}`;
            copy.append(link,meta);
            const button=document.createElement('button');button.type='button';button.className='tonal-btn';
            const update=()=>{button.disabled=isQuickLinkPinned(item);button.textContent=button.disabled?'ピン留め済み':'ピン留め';button.setAttribute('aria-label',item.title+'を'+(button.disabled?'ピン留め済み':'ブックマークへピン留め'));};update();
            button.onclick=()=>{try{pinQuickLink(item);update();status.textContent=item.title+'をブックマークに追加しました。';}catch(error){status.textContent=error.message;}};
            row.append(copy,button);results.append(row);
        }
        if(!items.length){const empty=document.createElement('p');empty.className='cc-empty';empty.textContent='一致するリンクがありません。キーワードやカテゴリを変えてください。';results.append(empty);}
        dialog.querySelector('#quick-link-more').hidden=items.length<=limit;
    }
    query.oninput=select.onchange=()=>{limit=50;render();results.scrollTop=0;};
    dialog.querySelector('#quick-link-more').onclick=()=>{const count=results.children.length;limit+=50;render();results.children[count]?.querySelector('a')?.focus();};
    const refresh=()=>render();window.addEventListener('storage',refresh);
    dialog.addEventListener('close',()=>window.removeEventListener('storage',refresh),{once:true});
    document.body.append(dialog);render();openUIDialog(dialog);query.focus();
}
export function initQuickLinks(){
    document.getElementById('quick-links-open')?.addEventListener('click',()=>openQuickLinks());
    document.addEventListener('lifetop:quick-link-pinned',async()=>{const {renderBookmarks}=await import('./bookmarks.js?v=14.0.0');renderBookmarks();});
}
