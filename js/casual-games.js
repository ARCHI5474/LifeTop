import { createMaterialIcon } from './icons.js?v=8.0';

export function lineWinner(board) {
    for (const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

export function toggleLights(board, index, size = 4) {
    const next = [...board];
    for (const i of [index, index % size ? index - 1 : -1, index % size < size - 1 ? index + 1 : -1, index - size, index + size]) {
        if (i >= 0 && i < next.length) next[i] = !next[i];
    }
    return next;
}

export function shuffledPairs(random = Math.random) {
    const cards = [...Array(8).keys(), ...Array(8).keys()];
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

export function initCasualGames() {
    const host = document.querySelector('[data-extra-games]');
    const tabs = document.querySelector('.game-selector-tabs');
    if (!host || !tabs) return;
    const definitions = [
        ['tictactoe', '三目並べ', '2人で交互に○と×を置き、縦・横・斜めに3つ並べたら勝ちです。', 3],
        ['memory', '神経衰弱', '同じ記号のペアを探しましょう。16枚すべてをそろえたらクリアです。', 4],
        ['lights', 'ライツアウト', '押したマスと上下左右が反転します。明るいマスをすべて消すとクリアです。', 4]
    ];
    const states = new Map();
    const symbols = ['★','●','▲','◆','♥','☀','☂','♬'];
    let mismatchTimer;
    for (const [id, label, help, size] of definitions) {
        const tab = document.createElement('button');
        tab.type = 'button'; tab.className = 'game-tab-btn'; tab.dataset.gameTab = id;
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', 'false'); tab.tabIndex = -1;
        tab.append(createMaterialIcon({tictactoe:'grid_on',memory:'star',lights:'sunny'}[id]));
        const caption = document.createElement('span');
        caption.textContent = label;
        tab.append(caption);
        tab.onclick = () => window.switchGameTab(id);
        tabs.append(tab);
        const pane = document.createElement('section');
        pane.className = 'game-pane'; pane.dataset.gamePane = id; pane.hidden = true;
        pane.setAttribute('role', 'tabpanel');
        pane.innerHTML = `<h3>${label}</h3><p>${help}</p><div class="extra-controls"><button type="button" data-reset>新しいゲーム</button></div><p class="casual-status" role="status" aria-live="polite"></p><div class="casual-board extra-board" role="group" aria-label="${label}の盤面" style="grid-template-columns:repeat(${size},minmax(0,1fr))"></div>`;
        host.append(pane);
        const status = pane.querySelector('.casual-status');
        const board = pane.querySelector('.casual-board');
        board.style.gridTemplateRows = `repeat(${size}, minmax(0, 1fr))`;
        const layout = document.createElement('div'); layout.className = 'game-layout casual-game-layout';
        const stage = document.createElement('div'); stage.className = 'game-stage-wrap'; stage.append(board);
        const sidebar = document.createElement('div'); sidebar.className = 'game-sidebar';
        sidebar.append(pane.querySelector('h3'), pane.querySelector('.extra-controls'), status);
        layout.append(stage, sidebar);
        pane.replaceChildren(layout);
        const cells = Array.from({length: size * size}, (_, index) => {
            const button = document.createElement('button'); button.type = 'button';
            button.onclick = () => play(index);
            board.append(button);
            return button;
        });
        const render = () => {
            const s = states.get(id);
            cells.forEach((button, i) => {
                const open = id === 'memory' && (s.open.includes(i) || s.matched.includes(i));
                button.textContent = id === 'memory' ? open ? symbols[s.board[i]] : '?' : id === 'lights' ? s.board[i] ? '●' : '○' : s.board[i] || '·';
                button.classList.toggle('is-open', open);
                button.classList.toggle('is-matched', id === 'memory' && s.matched.includes(i));
                button.classList.toggle('is-lit', id === 'lights' && s.board[i]);
                button.disabled = s.over || (id === 'tictactoe' && !!s.board[i]) || (id === 'memory' && (s.open.length === 2 || open));
                button.setAttribute('aria-label', `${Math.floor(i/size)+1}行${i%size+1}列 ${id === 'memory' ? open ? symbols[s.board[i]] + (s.matched.includes(i) ? ' ペア成立' : '') : '裏向き' : id === 'lights' ? s.board[i] ? '点灯' : '消灯' : s.board[i] || '空き'}`);
            });
            status.textContent = s.message;
            // If a just-played cell became disabled, keep keyboard navigation on the board.
            if (cells.includes(document.activeElement) && document.activeElement.disabled) {
                (cells.find(button => !button.disabled) || pane.querySelector('[data-reset]')).focus({preventScroll:true});
            }
        };
        const reset = () => {
            if (id === 'memory') clearTimeout(mismatchTimer);
            let initial = Array(size * size).fill(id === 'lights' ? false : null);
            if (id === 'lights') {
                // Generate by legal moves from the solved board, so every puzzle is solvable.
                for (let i = 0; i < 16; i++) if (Math.random() < .5) initial = toggleLights(initial, i);
                if (!initial.some(Boolean)) initial = toggleLights(initial, Math.floor(Math.random() * 16));
            }
            states.set(id, {board: id === 'memory' ? shuffledPairs() : initial, turn: '○', open: [], matched: [], moves: 0, over: false,
                message: id === 'tictactoe' ? '○の番 · 2人対戦' : id === 'memory' ? '0ペア / 8 · 0回' : '0手 · 明るいマスをすべて消しましょう'});
            render();
        };
        const play = i => {
            const s = states.get(id);
            if (s.over || cells[i].disabled) return;
            if (id === 'tictactoe') {
                s.board[i] = s.turn;
                const winner = lineWinner(s.board);
                s.over = !!winner || s.board.every(Boolean);
                s.turn = s.turn === '○' ? '×' : '○';
                s.message = winner ? `${winner}の勝ち！` : s.over ? '引き分けです' : `${s.turn}の番`;
            } else if (id === 'lights') {
                s.board = toggleLights(s.board, i); s.moves++;
                s.over = !s.board.some(Boolean);
                s.message = s.over ? `${s.moves}手でクリア！` : `${s.moves}手 · 残り${s.board.filter(Boolean).length}灯`;
            } else {
                s.open.push(i);
                if (s.open.length === 2) {
                    s.moves++;
                    const [a,b] = s.open;
                    if (s.board[a] === s.board[b]) {
                        s.matched.push(a,b); s.open = [];
                        s.over = s.matched.length === 16;
                    } else {
                        mismatchTimer = setTimeout(() => {
                            if (states.get(id) !== s) return;
                            s.open = []; render();
                        }, 900);
                    }
                }
                s.message = s.over ? `${s.moves}回ですべてのペアを発見！` : `${s.matched.length/2}ペア / 8 · ${s.moves}回${s.open.length === 1 ? ' · もう1枚選んでください' : ''}`;
            }
            render();
        };
        pane.querySelector('[data-reset]').onclick = reset;
        reset();
    }
}
