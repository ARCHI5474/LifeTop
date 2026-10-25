import { createMaterialIcon } from './icons.js?v=4.2.6-official';
/* Local two-player board games and a solo deduction game. */
export const neighbors = (i, size=9) => [i%size ? i-1:-1, i%size<size-1?i+1:-1, i>=size?i-size:-1, i<size*(size-1)?i+size:-1].filter(n=>n>=0);
function group(board,i) {
    const stones=new Set([i]), liberties=new Set(), queue=[i];
    for(const p of queue) for(const n of neighbors(p)) {
        if(!board[n]) liberties.add(n);
        else if(board[n]===board[i]&&!stones.has(n)){stones.add(n);queue.push(n);}
    }
    return {stones,liberties};
}
export function goMove(board,i,turn,previous) {
    if(board[i] || !Number.isInteger(i) || i<0 || i>=81) return null;
    const next=[...board]; next[i]=turn;
    for(const n of neighbors(i)) if(next[n]===-turn) {const g=group(next,n);if(!g.liberties.size)for(const p of g.stones)next[p]=0;}
    if(!group(next,i).liberties.size || next.join(',')===previous) return null;
    return next;
}
export function goScore(board) {
    const score={1:board.filter(x=>x===1).length, '-1':board.filter(x=>x===-1).length+6.5},seen=new Set();
    for(let i=0;i<81;i++) if(!board[i]&&!seen.has(i)) {
        const region=[i], borders=new Set();seen.add(i);
        for(const p of region)for(const n of neighbors(p)){if(board[n])borders.add(board[n]);else if(!seen.has(n)){seen.add(n);region.push(n);}}
        if(borders.size===1)score[[...borders][0]]+=region.length;
    }
    return score;
}
const labels={K:'玉',R:'飛',B:'角',G:'金',S:'銀',N:'桂',L:'香',P:'歩','+R':'龍','+B':'馬','+S':'全','+N':'圭','+L':'杏','+P':'と'};
const gold=[[0,1],[1,1],[-1,1],[1,0],[-1,0],[0,-1]];
export function shogiTargets(board,from) {
    const p=board[from];if(!p)return [];
    let steps=[],rays=[];
    const t=p.t;
    if(t==='K')steps=[...gold,[1,-1],[-1,-1]];
    else if(t==='G'||['+S','+N','+L','+P'].includes(t))steps=gold;
    else if(t==='P')steps=[[0,1]];
    else if(t==='N')steps=[[-1,2],[1,2]];
    else if(t==='S')steps=[[0,1],[-1,1],[1,1],[-1,-1],[1,-1]];
    if(t==='L')rays=[[0,1]];
    if(t==='B'||t==='+B'){rays=[[-1,-1],[1,-1],[-1,1],[1,1]];if(t==='+B')steps=[[0,1],[0,-1],[1,0],[-1,0]];}
    if(t==='R'||t==='+R'){rays=[[0,1],[0,-1],[1,0],[-1,0]];if(t==='+R')steps=[[-1,-1],[1,-1],[-1,1],[1,1]];}
    const result=[];
    for(const [dx,dy] of [...steps,...rays]) {
        const slide=rays.some(([x,y])=>x===dx&&y===dy);
        for(let k=1;k<=(slide?8:1);k++) {
            const x=from%9+dx*k,y=Math.floor(from/9)-dy*p.c*k;if(x<0||x>8||y<0||y>8)break;
            const to=y*9+x;if(board[to]?.c===p.c)break;result.push(to);if(board[to])break;
        }
    }
    return result;
}
export function inCheck(board,c) {const king=board.findIndex(p=>p?.c===c&&p.t==='K');return king<0||board.some((p,i)=>p?.c===-c&&shogiTargets(board,i).includes(king));}
function moved(board,from,to,promote=false) {const b=board.map(p=>p?{...p}:null);b[to]=b[from];b[from]=null;if(promote)b[to].t='+'+b[to].t;return b;}
function deadRank(t,c,to){const rank=c===1?Math.floor(to/9):8-Math.floor(to/9);return (['P','L'].includes(t)&&rank===0)||(t==='N'&&rank<=1);}
function dropAllowed(board,t,c,to){return !board[to]&&!deadRank(t,c,to)&&!(t==='P'&&board.some((p,i)=>i%9===to%9&&p?.c===c&&p.t==='P'));}
function legalDrop(board,t,c,to,hands,checkPawnMate=true) {
    if(!dropAllowed(board,t,c,to))return false;
    const b=[...board];b[to]={t,c};if(inCheck(b,c))return false;
    if(t==='P'&&checkPawnMate&&shogiTargets(b,to).some(i=>b[i]?.t==='K'&&b[i].c===-c)&&!hasMove(b,-c,hands,false))return false;
    return true;
}
function hasMove(board,c,hands,checkPawnMate=true){
    for(let from=0;from<81;from++)if(board[from]?.c===c)for(const to of shogiTargets(board,from))if(board[to]?.t!=='K'&&!inCheck(moved(board,from,to),c))return true;
    for(const t of Object.keys(hands[c]))if(hands[c][t]>0)for(let to=0;to<81;to++)if(legalDrop(board,t,c,to,hands,checkPawnMate))return true;
    return false;
}
export function initialShogi(){const b=Array(81).fill(null);const back=['L','N','S','G','K','G','S','N','L'];for(let x=0;x<9;x++){b[x]={t:back[x],c:-1};b[72+x]={t:back[x],c:1};b[18+x]={t:'P',c:-1};b[54+x]={t:'P',c:1};}for(const [i,t,c]of [[10,'R',-1],[16,'B',-1],[64,'B',1],[70,'R',1]])b[i]={t,c};return b;}
export function hitResult(answer,guess){const hit=[...guess].filter((x,i)=>answer[i]===x).length;return {hit,blow:[...guess].filter(x=>answer.includes(x)).length-hit};}
let go,shogi,hit;
const el=id=>document.getElementById(id);
const name=c=>c===1?'先手':'後手';
function replaceBoard(id, html) {
    const board = el(id);
    const active = document.activeElement;
    const cell = board.contains(active) ? active.dataset.cell : null;
    board.innerHTML = html;
    if (cell != null) {
        const next = board.querySelector('[data-cell="' + cell + '"]');
        (next && !next.disabled ? next : board).focus({ preventScroll: true });
    }
}
function resetGo(){go={board:Array(81).fill(0),turn:1,previous:null,passes:0,over:false,history:[]};renderGo();}
function renderGo(note=''){
    replaceBoard('go-board', go.board.map((v,i)=>`<button type="button" data-cell="${i}" aria-label="${Math.floor(i/9)+1}行${i%9+1}列 ${v===1?'黒':v===-1?'白':'空点'}" ${go.over?'disabled':''}>${v===1?'<span class="go-stone go-stone-black"></span>':v===-1?'<span class="go-stone go-stone-white"></span>':'·'}</button>`).join(''));
    el('go-status').textContent=note||`${go.turn===1?'黒':'白'}の番`;
}
function playGo(i){if(go.over)return;const b=goMove(go.board,i,go.turn,go.previous);if(!b){el('go-status').textContent='ここには打てません（自殺手・コウ・既存の石）。';return;}go.history.push(JSON.stringify({...go,history:[]}));go.previous=go.board.join(',');go.board=b;go.turn=-go.turn;go.passes=0;renderGo();}
function passGo(){if(go.over)return;go.history.push(JSON.stringify({...go,history:[]}));go.previous=go.board.join(',');go.turn=-go.turn;if(++go.passes===2){go.over=true;const s=goScore(go.board);renderGo(`終局：黒 ${s[1]}点 / 白 ${s[-1]}点（コミ6.5）・${s[1]>s[-1]?'黒':'白'}の勝ち`);}else renderGo('パスしました。'+(go.turn===1?'黒':'白')+'の番');}
function resetShogi(){shogi={board:initialShogi(),turn:1,hands:{1:{},'-1':{}},selected:null,drop:null,over:false,history:[],positions:[]};shogi.positions.push({key:JSON.stringify([shogi.board,shogi.hands,shogi.turn]),check:false,mover:-1});renderShogi();}
function renderShogi(note=''){
    const focusedHand = document.activeElement?.dataset.hand;
    let targets=[];if(shogi.selected!==null)targets=shogiTargets(shogi.board,shogi.selected).filter(to=>shogi.board[to]?.t!=='K'&&!inCheck(moved(shogi.board,shogi.selected,to),shogi.turn));
    if(shogi.drop)targets=Array.from({length:81},(_,i)=>i).filter(i=>legalDrop(shogi.board,shogi.drop,shogi.turn,i,shogi.hands));
    replaceBoard('shogi-board', shogi.board.map((p,i)=>`<button type="button" data-cell="${i}" data-owner="${p?.c||0}" class="${shogi.selected===i?'selected':''} ${targets.includes(i)?'legal':''}" aria-label="${Math.floor(i/9)+1}行${i%9+1}列 ${p?name(p.c)+labels[p.t]:'空き'}" ${shogi.over?'disabled':''}>${p?labels[p.t]:''}</button>`).join(''));
    el('shogi-hands').replaceChildren();
    for(const c of [1,-1]){const row=document.createElement('div');row.className='extra-controls';row.textContent=name(c)+'の持ち駒：';for(const [t,count]of Object.entries(shogi.hands[c]))if(count){const btn=document.createElement('button');btn.type='button';btn.dataset.hand=t;btn.textContent=labels[t]+' ×'+count;btn.disabled=c!==shogi.turn||shogi.over;btn.setAttribute('aria-pressed',String(shogi.drop===t&&c===shogi.turn));btn.onclick=()=>{shogi.drop=shogi.drop===t?null:t;shogi.selected=null;renderShogi();};row.append(btn);}el('shogi-hands').append(row);}
    if (focusedHand) { const button = el('shogi-hands').querySelector('[data-hand="' + focusedHand + '"]'); (button && !button.disabled ? button : el('shogi-board')).focus({ preventScroll: true }); }
    el('shogi-status').textContent=note||`${name(shogi.turn)}の番${inCheck(shogi.board,shogi.turn)?'（王手）':''} — ${shogi.drop?'打つ場所を選択':'駒と移動先を選択'}`;
}
function playShogi(to){
    if(shogi.over)return;
    const {board,turn,selected,drop}=shogi;
    if(board[to]?.c===turn){shogi.selected=to;shogi.drop=null;renderShogi();return;}
    let next;
    if(drop){if(!legalDrop(board,drop,turn,to,shogi.hands)){el('shogi-status').textContent='ここには打てません。二歩・行き所のない駒・打ち歩詰め・王手を確認してください。';return;}next=[...board];next[to]={t:drop,c:turn};}
    else {if(selected===null||!shogiTargets(board,selected).includes(to)||board[to]?.t==='K'||inCheck(moved(board,selected,to),turn))return;
        const t=board[selected].t;const zone=i=>turn===1?Math.floor(i/9)<3:Math.floor(i/9)>5;
        const promote=!t.startsWith('+')&&!['K','G'].includes(t)&&(deadRank(t,turn,to)||((zone(selected)||zone(to))&&window.confirm('この駒を成りますか？')));
        next=moved(board,selected,to,promote);
    }
    shogi.history.push(JSON.stringify({...shogi,history:[]}));
    if(drop)shogi.hands[turn][drop]--;else if(board[to]){const t=board[to].t.replace('+','');shogi.hands[turn][t]=(shogi.hands[turn][t]||0)+1;}
    shogi.board=next;shogi.turn=-turn;shogi.selected=null;shogi.drop=null;
    const position=JSON.stringify([next,shogi.hands,shogi.turn]);shogi.positions.push({key:position,check:inCheck(next,-turn),mover:turn});
    if(!hasMove(next,-turn,shogi.hands)){shogi.over=true;renderShogi(`${name(turn)}の勝ち${inCheck(next,-turn)?'（詰み）':''}`);return;}
    const occurrences=shogi.positions.map((p,i)=>p.key===position?i:-1).filter(i=>i>=0);
    if(occurrences.length>=4){const cycle=shogi.positions.slice(occurrences[occurrences.length-4]+1);const checker=[1,-1].find(c=>cycle.filter(p=>p.mover===c).every(p=>p.check));shogi.over=true;renderShogi(checker?`連続王手の千日手：${name(-checker)}の勝ち`:'千日手で引き分け');return;}
    renderShogi();
}
function resetHit(){const digits=Array.from({length:10},(_,i)=>String(i));for(let i=9;i>0;i--){const j=Math.floor(Math.random()*(i+1));[digits[i],digits[j]]=[digits[j],digits[i]];}hit={answer:digits.slice(0,4).join(''),count:0,over:false};el('hit-history').innerHTML='';el('hit-input').value='';el('hit-input').disabled=false;el('hit-submit').disabled=false;el('hit-status').textContent='重複しない4桁（先頭0も可）を入力してください。';}
function guessHit(e){e.preventDefault();if(hit.over)return;const value=el('hit-input').value.trim();if(!/^\d{4}$/.test(value)||new Set(value).size!==4){el('hit-status').textContent='異なる数字4つを入力してください。';return;}const {hit:h,blow}=hitResult(hit.answer,value);hit.count++;const row=document.createElement('tr');for(const cellValue of [hit.count,value,h,blow]){const cell=document.createElement('td');cell.textContent=cellValue;row.append(cell);}el('hit-history').prepend(row);hit.over=h===4||hit.count===10;el('hit-status').textContent=h===4?`${hit.count}回で正解！`:hit.over?`終了。正解は ${hit.answer} でした。`:`${h} Hit / ${blow} Blow — 残り${10-hit.count}回`;el('hit-input').disabled=hit.over;el('hit-submit').disabled=hit.over;if(!hit.over){el('hit-input').select();}}
export function initExtraGames(){
    const host=document.querySelector('[data-extra-games]');if(!host)return;
    const tabs=document.querySelector('.game-selector-tabs');
    for(const [id,label]of [['go','囲碁'],['shogi','将棋'],['hitblow','ヒットアンドブロー']]){
        const btn=document.createElement('button');btn.type='button';btn.className='game-tab-btn';btn.dataset.gameTab=id;btn.setAttribute('role','tab');btn.setAttribute('aria-selected','false');btn.append(createMaterialIcon({go:'grid_on',shogi:'account_balance',hitblow:'pin'}[id]));const caption=document.createElement('span');caption.textContent=label;btn.append(caption);btn.onclick=()=>window.switchGameTab(id);tabs.append(btn);
    }
    host.innerHTML=`<section class="game-pane" data-game-pane="go" role="tabpanel" aria-label="囲碁" hidden><h3>囲碁 · 9路盤 / 2人対戦</h3><p>石を囲んで取り合います。コウ・自殺手は禁止。連続2回のパスで終局し、中国式の面積で計算（白コミ6.5目）。死石は終局前に取り切ってください。</p><div class="extra-controls"><button id="go-reset" type="button">新しい対局</button><button id="go-pass" type="button">パス</button><button id="go-undo" type="button">1手戻す</button></div><p id="go-status" class="extra-game-status" role="status"></p><div id="go-board" tabindex="0" role="group" aria-label="囲碁の盤面" class="extra-board" style="grid-template-columns:repeat(9,1fr)"></div></section>
    <section class="game-pane" data-game-pane="shogi" role="tabpanel" aria-label="将棋" hidden><h3>将棋 · 2人対戦</h3><p>駒と移動先を選びます。持ち駒を選ぶと盤に打てます。成り・王手・二歩・打ち歩詰めを判定します。入玉時は相談して対局を終了してください。</p><div class="extra-controls"><button id="shogi-reset" type="button">新しい対局</button><button id="shogi-undo" type="button">1手戻す</button><button id="shogi-resign" type="button">投了</button></div><p id="shogi-status" class="extra-game-status" role="status"></p><div id="shogi-hands"></div><div id="shogi-board" tabindex="0" role="group" aria-label="将棋の盤面" class="extra-board" style="grid-template-columns:repeat(9,1fr)"></div></section>
    <section class="game-pane" data-game-pane="hitblow" role="tabpanel" aria-label="ヒットアンドブロー" hidden><h3>ヒットアンドブロー</h3><p>重複のない4桁を10回以内に当てましょう。数字と位置の両方が一致するとHit、数字だけ一致するとBlowです。</p><form id="hit-form" class="extra-controls"><label for="hit-input">予想する4桁</label><input id="hit-input" inputmode="numeric" maxlength="4" autocomplete="off" pattern="[0-9]{4}" required><button id="hit-submit" type="submit">判定</button><button id="hit-reset" type="button">新しい問題</button></form><p id="hit-status" role="status"></p><table class="hit-history"><thead><tr><th>回</th><th>予想</th><th>Hit</th><th>Blow</th></tr></thead><tbody id="hit-history"></tbody></table></section>`;
    for (const id of ['go', 'shogi']) {
        const pane = host.querySelector('[data-game-pane="' + id + '"]');
        const layout = document.createElement('div'); layout.className = 'game-layout extra-game-layout';
        const stage = document.createElement('div'); stage.className = 'game-stage-wrap'; stage.append(el(id + '-board'));
        const sidebar = document.createElement('div'); sidebar.className = 'game-sidebar';
        sidebar.append(pane.querySelector('.extra-controls'), el(id + '-status'));
        if (id === 'shogi') sidebar.append(el('shogi-hands'));
        layout.append(stage, sidebar); pane.replaceChildren(layout);
    }
    el('go-board').onclick=e=>{const cell=e.target.closest('[data-cell]');if(cell)playGo(Number(cell.dataset.cell));};
    el('shogi-board').onclick=e=>{const cell=e.target.closest('[data-cell]');if(cell)playShogi(Number(cell.dataset.cell));};
    el('go-reset').onclick=resetGo;el('go-pass').onclick=passGo;
    el('go-undo').onclick=()=>{if(!go.history.length)return;const history=go.history;go={...JSON.parse(history.pop()),history};renderGo();};
    el('shogi-reset').onclick=resetShogi;
    el('shogi-undo').onclick=()=>{if(!shogi.history.length)return;const history=shogi.history;shogi={...JSON.parse(history.pop()),history,selected:null,drop:null};renderShogi();};
    el('shogi-resign').onclick=()=>{if(shogi.over)return;shogi.over=true;renderShogi(`${name(shogi.turn)}が投了。${name(-shogi.turn)}の勝ち`);};
    el('hit-form').onsubmit=guessHit;el('hit-reset').onclick=resetHit;
    resetGo();resetShogi();resetHit();
}
