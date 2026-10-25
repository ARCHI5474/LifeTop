/* LifeTop - Mini Game Center (Snake, Sliding Puzzle, Othello) */

const GAME_STATS_KEY = 'lifetop_v4_game_stats';

let gameStats = {
    snakeBest: { normal: 0, fast: 0, portal: 0 },
    puzzleBest: { 3: null, 4: null, 5: null },
    othelloRecord: { win: 0, loss: 0, draw: 0 }
};

try {
    const parsed = JSON.parse(localStorage.getItem(GAME_STATS_KEY) || '{}');
    if (parsed && typeof parsed === 'object') {
        gameStats = {
            snakeBest: { ...gameStats.snakeBest, ...(parsed.snakeBest || {}) },
            puzzleBest: { ...gameStats.puzzleBest, ...(parsed.puzzleBest || {}) },
            othelloRecord: { ...gameStats.othelloRecord, ...(parsed.othelloRecord || {}) }
        };
    }
} catch {}

function saveGameStats() {
    try {
        localStorage.setItem(GAME_STATS_KEY, JSON.stringify(gameStats));
    } catch {}
}

let activeGame = 'snake'; // 'snake' | 'puzzle' | 'othello'
let gameModalTrigger = null;

// =========================================================
// Modal & Tab Management
// =========================================================
export function toggleGameModal(forceState) {
    const modal = document.getElementById('game-modal');
    const overlay = document.getElementById('game-overlay');
    if (!modal) return;

    const shouldOpen = typeof forceState === 'boolean' ? forceState : !modal.classList.contains('active');
    modal.classList.toggle('active', shouldOpen);
    modal.inert = !shouldOpen;
    overlay?.classList.toggle('active', shouldOpen);
    if (document.body?.style) {
        document.body.style.overflow = shouldOpen ? 'hidden' : '';
    }

    if (shouldOpen) {
        gameModalTrigger = document.activeElement;
        switchGameTab(activeGame);
        setTimeout(() => {
            modal.querySelector('.game-tab-btn.active')?.focus({ preventScroll: true });
        }, 40);
    } else {
        document.getElementById('game-rules')?.hidePopover();
        pauseSnakeGame();
        stopPuzzleTimer();
        if (gameModalTrigger?.focus) {
            gameModalTrigger.focus({ preventScroll: true });
        }
    }
}

export function switchGameTab(gameId) {
    if (!['snake', 'puzzle', 'othello', 'go', 'shogi', 'hitblow'].includes(gameId)) return;
    activeGame = gameId;
    const rules = {
        snake: '方向キー・WASDまたは画面の方向ボタンで操作します。エサを集め、壁や自分の体を避けましょう。スペースで一時停止。',
        puzzle: '数字を左上から順に並べます。空白と同じ行・列のタイルを押すとまとめてスライドできます。',
        othello: '相手の石を挟んで裏返します。置ける場所に表示される数字は裏返せる枚数です。黒が先手、置けないときは自動でパスします。',
        go: '9路盤の2人対戦。石を囲んで取り合います。コウ・自殺手は禁止。連続2回のパスで終局し中国式の面積で計算します（白コミ6.5目）。死石は終局前に取り切ってください。',
        shogi: '駒と移動先を選びます。持ち駒を選ぶと盤に打てます。成り・王手・二歩・打ち歩詰めを判定します。入玉時は相談して終局してください。',
        hitblow: '重複しない4桁を10回以内に当てます。数字と位置が一致するとHit、数字だけ一致するとBlowです。先頭の0も使えます。'
    };
    const ruleText = document.getElementById('game-rules-text');
    if (ruleText) ruleText.textContent = rules[gameId];

    if (gameId !== 'snake') pauseSnakeGame();

    document.querySelectorAll?.('[data-game-tab]')?.forEach?.(btn => {
        const isTarget = btn.dataset.gameTab === gameId;
        btn.classList?.toggle?.('active', isTarget);
        btn.setAttribute?.('aria-selected', String(isTarget));
    });

    document.querySelectorAll?.('[data-game-pane]')?.forEach?.(pane => {
        const isTarget = pane.dataset.gamePane === gameId;
        pane.classList?.toggle?.('active', isTarget);
        pane.hidden = !isTarget;
    });

    if (gameId === 'snake') {
        renderSnakeCanvas();
        updateSnakeUI();
    } else if (gameId === 'puzzle') {
        if (puzzleState.tiles.length === 0) initPuzzleBoard(puzzleState.size);
        else renderPuzzleBoard();
    } else if (gameId === 'othello') {
        if (!othelloState.initialized) initOthelloGame();
        else renderOthelloBoard();
    }
}

// =========================================================
// 1. SNAKE GAME (ヘビゲーム)
// =========================================================
const SNAKE_GRID = 20;
const SNAKE_CANVAS_SIZE = 520;
const SNAKE_CELL = SNAKE_CANVAS_SIZE / SNAKE_GRID;

let snakeState = {
    mode: 'normal', // 'normal' | 'fast' | 'portal'
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    snake: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 14, y: 10 },
    bonusFood: null, // { x, y, ticksLeft }
    particles: [],
    timerId: null
};

function getSnakeTickMs() {
    const base = snakeState.mode === 'fast' ? 88 : 122;
    const speedUp = Math.min(48, Math.floor(snakeState.score / 40) * 6);
    return Math.max(54, base - speedUp);
}

function resetSnakeState() {
    clearInterval(snakeState.timerId);
    snakeState.running = false;
    snakeState.paused = false;
    snakeState.gameOver = false;
    snakeState.score = 0;
    snakeState.snake = [
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 }
    ];
    snakeState.dir = { x: 1, y: 0 };
    snakeState.nextDir = { x: 1, y: 0 };
    snakeState.bonusFood = null;
    snakeState.particles = [];
    spawnSnakeFood();
    updateSnakeUI();
    renderSnakeCanvas();
}

function spawnSnakeFood() {
    const occupied = new Set(snakeState.snake.map(s => `${s.x},${s.y}`));
    if (snakeState.bonusFood) occupied.add(`${snakeState.bonusFood.x},${snakeState.bonusFood.y}`);
    const freeCells = [];
    for (let y = 0; y < SNAKE_GRID; y++) {
        for (let x = 0; x < SNAKE_GRID; x++) {
            if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
        }
    }
    if (freeCells.length > 0) {
        snakeState.food = freeCells[Math.floor(Math.random() * freeCells.length)];
    }
}

function spawnBonusFood() {
    if (snakeState.bonusFood) return;
    const occupied = new Set(snakeState.snake.map(s => `${s.x},${s.y}`));
    occupied.add(`${snakeState.food.x},${snakeState.food.y}`);
    const freeCells = [];
    for (let y = 0; y < SNAKE_GRID; y++) {
        for (let x = 0; x < SNAKE_GRID; x++) {
            if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
        }
    }
    if (freeCells.length > 0) {
        const pos = freeCells[Math.floor(Math.random() * freeCells.length)];
        snakeState.bonusFood = { x: pos.x, y: pos.y, ticksLeft: 45 };
    }
}

export function setSnakeMode(mode) {
    if (!['normal', 'fast', 'portal'].includes(mode)) return;
    snakeState.mode = mode;
    document.querySelectorAll?.('[data-snake-mode]')?.forEach?.(btn => {
        const active = btn.dataset.snakeMode === mode;
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-pressed', String(active));
    });
    resetSnakeState();
}

export function startOrToggleSnake() {
    if (snakeState.gameOver) {
        resetSnakeState();
    }
    if (snakeState.running && !snakeState.paused) {
        pauseSnakeGame();
        return;
    }
    snakeState.running = true;
    snakeState.paused = false;
    scheduleSnakeTick();
    updateSnakeUI();
    renderSnakeCanvas();
}

export function pauseSnakeGame() {
    if (!snakeState.running || snakeState.paused) return;
    snakeState.paused = true;
    clearInterval(snakeState.timerId);
    updateSnakeUI();
    renderSnakeCanvas();
}

export function restartSnakeGame() {
    resetSnakeState();
    startOrToggleSnake();
}

function scheduleSnakeTick() {
    clearInterval(snakeState.timerId);
    snakeState.timerId = setInterval(stepSnake, getSnakeTickMs());
}

export function setSnakeDirection(dirName) {
    const map = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };
    const next = map[dirName];
    if (!next) return;
    // Prevent 180-degree reversal
    if (snakeState.dir.x + next.x === 0 && snakeState.dir.y + next.y === 0) return;
    snakeState.nextDir = next;
    if (!snakeState.running && !snakeState.gameOver) {
        startOrToggleSnake();
    }
}


function stepSnake() {
    if (!snakeState.running || snakeState.paused || snakeState.gameOver) return;

    snakeState.dir = { ...snakeState.nextDir };
    const head = snakeState.snake[0];
    let nx = head.x + snakeState.dir.x;
    let ny = head.y + snakeState.dir.y;

    if (snakeState.mode === 'portal') {
        nx = (nx + SNAKE_GRID) % SNAKE_GRID;
        ny = (ny + SNAKE_GRID) % SNAKE_GRID;
    } else if (nx < 0 || nx >= SNAKE_GRID || ny < 0 || ny >= SNAKE_GRID) {
        onSnakeGameOver();
        return;
    }

    // Check self collision (excluding tail tip unless growing)
    const willEat = (nx === snakeState.food.x && ny === snakeState.food.y) ||
        (snakeState.bonusFood && nx === snakeState.bonusFood.x && ny === snakeState.bonusFood.y);
    const bodyToCheck = willEat ? snakeState.snake : snakeState.snake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === nx && seg.y === ny)) {
        onSnakeGameOver();
        return;
    }

    snakeState.snake.unshift({ x: nx, y: ny });

    if (nx === snakeState.food.x && ny === snakeState.food.y) {
        snakeState.score += 10;
        if (snakeState.score > (gameStats.snakeBest[snakeState.mode] || 0)) {
            gameStats.snakeBest[snakeState.mode] = snakeState.score;
            saveGameStats();
        }
        spawnSnakeFood();
        if (snakeState.score % 50 === 0) {
            spawnBonusFood();
        }
        scheduleSnakeTick();
    } else if (snakeState.bonusFood && nx === snakeState.bonusFood.x && ny === snakeState.bonusFood.y) {
        snakeState.score += 30;
        snakeState.bonusFood = null;
        if (snakeState.score > (gameStats.snakeBest[snakeState.mode] || 0)) {
            gameStats.snakeBest[snakeState.mode] = snakeState.score;
            saveGameStats();
        }
        scheduleSnakeTick();
    } else {
        snakeState.snake.pop();
    }

    if (snakeState.bonusFood) {
        snakeState.bonusFood.ticksLeft--;
        if (snakeState.bonusFood.ticksLeft <= 0) {
            snakeState.bonusFood = null;
        }
    }

    updateSnakeUI();
    renderSnakeCanvas();
}

function onSnakeGameOver() {
    snakeState.gameOver = true;
    snakeState.running = false;
    clearInterval(snakeState.timerId);
    if (snakeState.score > (gameStats.snakeBest[snakeState.mode] || 0)) {
        gameStats.snakeBest[snakeState.mode] = snakeState.score;
        saveGameStats();
    }
    updateSnakeUI();
    renderSnakeCanvas();
}

function updateSnakeUI() {
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const lenEl = document.getElementById('snake-length');
    const startBtn = document.getElementById('snake-start-btn');
    const statusEl = document.getElementById('snake-status-msg');

    if (scoreEl) scoreEl.textContent = String(snakeState.score);
    if (bestEl) bestEl.textContent = String(gameStats.snakeBest[snakeState.mode] || 0);
    if (lenEl) lenEl.textContent = String(snakeState.snake.length);

    if (startBtn) {
        if (snakeState.gameOver) {
            startBtn.innerHTML = '<span class="material-symbols-outlined">replay</span> もう一度遊ぶ';
        } else if (snakeState.running && !snakeState.paused) {
            startBtn.innerHTML = '<span class="material-symbols-outlined">pause</span> 一時停止';
        } else if (snakeState.paused) {
            startBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> 再開';
        } else {
            startBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> スタート';
        }
    }

    if (statusEl) {
        if (snakeState.gameOver) {
            statusEl.textContent = `ゲームオーバー！ スコア: ${snakeState.score}点`;
        } else if (snakeState.paused) {
            statusEl.textContent = '一時停止中（スペースキーまたはボタンで再開）';
        } else if (snakeState.running) {
            statusEl.textContent = snakeState.bonusFood
                ? `ボーナスターゲット出現中！（残り${snakeState.bonusFood.ticksLeft}）`
                : '矢印キー / WASD / スワイプで操作';
        } else {
            statusEl.textContent = 'スタートまたは方向キーを押して開始';
        }
    }
}

function renderSnakeCanvas() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const isLight = document.documentElement.dataset?.colorMode === 'light';

    // Background
    ctx.fillStyle = isLight ? '#eef4fb' : '#091222';
    ctx.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);

    // Subtle checker grid
    ctx.fillStyle = isLight ? 'rgba(15, 29, 51, 0.035)' : 'rgba(255, 255, 255, 0.025)';
    for (let y = 0; y < SNAKE_GRID; y++) {
        for (let x = 0; x < SNAKE_GRID; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillRect(x * SNAKE_CELL, y * SNAKE_CELL, SNAKE_CELL, SNAKE_CELL);
            }
        }
    }

    // Portal border indicator
    if (snakeState.mode === 'portal') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(1.5, 1.5, SNAKE_CANVAS_SIZE - 3, SNAKE_CANVAS_SIZE - 3);
        ctx.setLineDash([]);
    }

    // Draw Normal Apple
    const fx = (snakeState.food.x + 0.5) * SNAKE_CELL;
    const fy = (snakeState.food.y + 0.5) * SNAKE_CELL;
    ctx.save();
    ctx.shadowColor = 'rgba(244, 63, 94, 0.55)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(fx, fy + 1, SNAKE_CELL * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // Apple leaf
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.ellipse(fx + 2, fy - SNAKE_CELL * 0.34, 4, 2.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Bonus Star Food
    if (snakeState.bonusFood) {
        const bx = (snakeState.bonusFood.x + 0.5) * SNAKE_CELL;
        const by = (snakeState.bonusFood.y + 0.5) * SNAKE_CELL;
        ctx.save();
        ctx.shadowColor = 'rgba(250, 204, 21, 0.75)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(bx, by, SNAKE_CELL * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#713f12';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', bx, by + 1);
        ctx.restore();
    }

    // Draw Snake Segments
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--p-strong').trim() || '#38bdf8';
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--p').trim() || '#2F75A8';

    snakeState.snake.forEach((seg, index) => {
        const x = seg.x * SNAKE_CELL + 2;
        const y = seg.y * SNAKE_CELL + 2;
        const size = SNAKE_CELL - 4;
        const radius = index === 0 ? 8 : 6;

        ctx.save();
        if (index === 0) {
            ctx.fillStyle = accent;
            ctx.shadowColor = accent;
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = index % 2 === 0 ? primary : accent;
            ctx.globalAlpha = Math.max(0.52, 1 - index * 0.012);
        }

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, size, size, radius);
        } else {
            ctx.rect(x, y, size, size);
        }
        ctx.fill();

        // Draw eyes on head
        if (index === 0) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#091222';
            const cx = seg.x * SNAKE_CELL + SNAKE_CELL / 2;
            const cy = seg.y * SNAKE_CELL + SNAKE_CELL / 2;
            const offset = 4.5;
            const forward = 3.5;
            let e1x = cx + snakeState.dir.x * forward - snakeState.dir.y * offset;
            let e1y = cy + snakeState.dir.y * forward + snakeState.dir.x * offset;
            let e2x = cx + snakeState.dir.x * forward + snakeState.dir.y * offset;
            let e2y = cy + snakeState.dir.y * forward - snakeState.dir.x * offset;
            ctx.beginPath();
            ctx.arc(e1x, e1y, 2.3, 0, Math.PI * 2);
            ctx.arc(e2x, e2y, 2.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // Update & draw particles
    for (let i = snakeState.particles.length - 1; i >= 0; i--) {
        const p = snakeState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.14;
        if (p.alpha <= 0) {
            snakeState.particles.splice(i, 1);
            continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Overlay when gameOver or not started
    if (snakeState.gameOver || (!snakeState.running && snakeState.score === 0)) {
        ctx.save();
        ctx.fillStyle = isLight ? 'rgba(240, 246, 255, 0.76)' : 'rgba(6, 12, 24, 0.72)';
        ctx.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE);

        ctx.textAlign = 'center';
        ctx.fillStyle = isLight ? '#0f1d33' : '#f0f6ff';
        ctx.font = '800 28px Outfit, sans-serif';
        ctx.fillText(
            snakeState.gameOver ? 'GAME OVER' : 'SNAKE ARCADE',
            SNAKE_CANVAS_SIZE / 2,
            SNAKE_CANVAS_SIZE / 2 - 14
        );

        ctx.fillStyle = isLight ? 'rgba(20, 39, 68, 0.78)' : 'rgba(226, 238, 255, 0.78)';
        ctx.font = '600 15px Outfit, sans-serif';
        ctx.fillText(
            snakeState.gameOver
                ? `獲得スコア: ${snakeState.score}点 — クリックまたはSpaceで再挑戦`
                : '画面タップ / スタートボタン / 矢印キーで開始',
            SNAKE_CANVAS_SIZE / 2,
            SNAKE_CANVAS_SIZE / 2 + 20
        );
        ctx.restore();
    }
}

// =========================================================
// 2. SLIDING PUZZLE (スライドパズル 3x3 / 4x4 / 5x5)
// =========================================================
let puzzleState = {
    size: 4, // 3, 4, 5
    tiles: [], // 1..N-1 and 0 for blank
    moves: 0,
    seconds: 0,
    timerId: null,
    running: false,
    solved: false,
    hintTile: null
};

export function setPuzzleSize(size) {
    const n = Number(size);
    if (![3, 4, 5].includes(n)) return;
    puzzleState.size = n;
    document.querySelectorAll?.('[data-puzzle-size]')?.forEach?.(btn => {
        const active = Number(btn.dataset.puzzleSize) === n;
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-pressed', String(active));
    });
    initPuzzleBoard(n);
}

export function initPuzzleBoard(size = puzzleState.size) {
    stopPuzzleTimer();
    puzzleState.size = size;
    const total = size * size;
    const solved = Array.from({ length: total }, (_, i) => (i + 1) % total);
    const tiles = [...solved];

    // Perform guaranteed legal random moves from the solved state
    let blankIdx = total - 1;
    let prevBlankIdx = -1;
    const shuffleSteps = size === 3 ? 100 : size === 4 ? 220 : 360;

    for (let step = 0; step < shuffleSteps; step++) {
        const neighbors = getPuzzleNeighbors(blankIdx, size).filter(idx => idx !== prevBlankIdx);
        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        tiles[blankIdx] = tiles[pick];
        tiles[pick] = 0;
        prevBlankIdx = blankIdx;
        blankIdx = pick;
    }

    // Ensure it's not accidentally already solved
    if (tiles.every((val, idx) => val === solved[idx])) {
        const neighbors = getPuzzleNeighbors(blankIdx, size);
        const pick = neighbors[0];
        tiles[blankIdx] = tiles[pick];
        tiles[pick] = 0;
    }

    puzzleState.tiles = tiles;
    puzzleState.moves = 0;
    puzzleState.seconds = 0;
    puzzleState.running = false;
    puzzleState.solved = false;
    puzzleState.hintTile = null;
    renderPuzzleBoard();
    updatePuzzleStatsUI();
}

function getPuzzleNeighbors(index, size) {
    const r = Math.floor(index / size);
    const c = index % size;
    const list = [];
    if (r > 0) list.push((r - 1) * size + c);
    if (r < size - 1) list.push((r + 1) * size + c);
    if (c > 0) list.push(r * size + (c - 1));
    if (c < size - 1) list.push(r * size + (c + 1));
    return list;
}

function startPuzzleTimerIfNeeded() {
    if (puzzleState.running || puzzleState.solved) return;
    puzzleState.running = true;
    clearInterval(puzzleState.timerId);
    puzzleState.timerId = setInterval(() => {
        puzzleState.seconds++;
        updatePuzzleStatsUI();
    }, 1000);
}

function stopPuzzleTimer() {
    puzzleState.running = false;
    clearInterval(puzzleState.timerId);
    puzzleState.timerId = null;
}

export function clickPuzzleTile(index) {
    if (puzzleState.solved) return;
    const size = puzzleState.size;
    const blankIdx = puzzleState.tiles.indexOf(0);
    if (index < 0 || index >= size * size || index === blankIdx) return;

    const r1 = Math.floor(index / size);
    const c1 = index % size;
    const r0 = Math.floor(blankIdx / size);
    const c0 = blankIdx % size;

    if (r1 !== r0 && c1 !== c0) return; // Must share row or column with blank

    startPuzzleTimerIfNeeded();
    puzzleState.hintTile = null;

    // Slide all intermediate tiles along the row or column
    if (r1 === r0) {
        const step = c1 < c0 ? -1 : 1;
        for (let c = c0; c !== c1; c += step) {
            const target = r0 * size + c;
            const next = r0 * size + (c + step);
            puzzleState.tiles[target] = puzzleState.tiles[next];
        }
    } else {
        const step = r1 < r0 ? -1 : 1;
        for (let r = r0; r !== r1; r += step) {
            const target = r * size + c0;
            const next = (r + step) * size + c0;
            puzzleState.tiles[target] = puzzleState.tiles[next];
        }
    }
    puzzleState.tiles[index] = 0;
    puzzleState.moves++;

    checkPuzzleSolved();
    renderPuzzleBoard();
    updatePuzzleStatsUI();
}

export function showPuzzleHint() {
    if (puzzleState.solved) return;
    const size = puzzleState.size;
    const blankIdx = puzzleState.tiles.indexOf(0);
    const neighbors = getPuzzleNeighbors(blankIdx, size);

    // Pick the neighbor whose move reduces total Manhattan distance the most
    let bestIdx = neighbors[0];
    let bestScore = Infinity;

    for (const nIdx of neighbors) {
        const copy = [...puzzleState.tiles];
        copy[blankIdx] = copy[nIdx];
        copy[nIdx] = 0;
        const dist = computeManhattanDistance(copy, size);
        if (dist < bestScore) {
            bestScore = dist;
            bestIdx = nIdx;
        }
    }
    puzzleState.hintTile = puzzleState.tiles[bestIdx];
    renderPuzzleBoard();
}

function computeManhattanDistance(tiles, size) {
    let sum = 0;
    for (let i = 0; i < tiles.length; i++) {
        const val = tiles[i];
        if (val === 0) continue;
        const targetIdx = val - 1;
        const r1 = Math.floor(i / size), c1 = i % size;
        const r2 = Math.floor(targetIdx / size), c2 = targetIdx % size;
        sum += Math.abs(r1 - r2) + Math.abs(c1 - c2);
    }
    return sum;
}

function checkPuzzleSolved() {
    const total = puzzleState.size * puzzleState.size;
    const isSolved = puzzleState.tiles.every((val, idx) => val === (idx + 1) % total);
    if (!isSolved) return;

    puzzleState.solved = true;
    stopPuzzleTimer();

    const prevBest = gameStats.puzzleBest[puzzleState.size];
    if (!prevBest || puzzleState.moves < prevBest.moves || (puzzleState.moves === prevBest.moves && puzzleState.seconds < prevBest.seconds)) {
        gameStats.puzzleBest[puzzleState.size] = {
            moves: puzzleState.moves,
            seconds: puzzleState.seconds
        };
        saveGameStats();
    }
}

function formatGameTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updatePuzzleStatsUI() {
    const movesEl = document.getElementById('puzzle-moves');
    const timeEl = document.getElementById('puzzle-time');
    const bestEl = document.getElementById('puzzle-best');
    const statusEl = document.getElementById('puzzle-status-msg');

    if (movesEl) movesEl.textContent = `${puzzleState.moves}手`;
    if (timeEl) timeEl.textContent = formatGameTime(puzzleState.seconds);

    const best = gameStats.puzzleBest[puzzleState.size];
    if (bestEl) {
        bestEl.textContent = best ? `${best.moves}手 (${formatGameTime(best.seconds)})` : '未記録';
    }

    if (statusEl) {
        if (puzzleState.solved) {
            statusEl.textContent = `クリアおめでとうございます！ ${puzzleState.moves}手・${formatGameTime(puzzleState.seconds)}で完成！`;
        } else {
            const total = puzzleState.size * puzzleState.size - 1;
            const correctCount = puzzleState.tiles.filter((v, i) => v !== 0 && v === i + 1).length;
            statusEl.textContent = `正しい位置のタイル: ${correctCount} / ${total}枚（複数タイルまとめスライド対応）`;
        }
    }
}

function renderPuzzleBoard() {
    const board = document.getElementById('puzzle-board');
    if (!board) return;
    const size = puzzleState.size;
    board.style.setProperty('--puzzle-size', String(size));

    const keepBoardFocus = board.contains(document.activeElement);
    board.innerHTML = puzzleState.tiles.map((val, idx) => {
        if (val === 0) {
            return `<div class="puzzle-tile is-blank" aria-hidden="true"></div>`;
        }
        const isCorrect = val === idx + 1;
        const isHint = puzzleState.hintTile === val;
        return `
            <button type="button"
                class="puzzle-tile ${isCorrect ? 'is-correct' : ''} ${isHint ? 'is-hint' : ''} ${puzzleState.solved ? 'is-solved' : ''}"
                onclick="clickPuzzleTile(${idx})"
                aria-label="タイル ${val}">
                <span class="puzzle-tile-num">${val}</span>
                ${isCorrect ? '<span class="puzzle-tile-dot" aria-hidden="true"></span>' : ''}
            </button>
        `;
    }).join('');
    if (keepBoardFocus) board.focus({ preventScroll: true });
}

// =========================================================
// 3. OTHELLO / REVERSI (オセロ 8x8 vs Smart AI / 2P)
// =========================================================
const OTHELLO_DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

const OTHELLO_WEIGHTS = [
    [ 100, -28,  16,   8,   8,  16, -28, 100],
    [ -28, -45,  -4,  -3,  -3,  -4, -45, -28],
    [  16,  -4,  12,   4,   4,  12,  -4,  16],
    [   8,  -3,   4,   2,   2,   4,  -3,   8],
    [   8,  -3,   4,   2,   2,   4,  -3,   8],
    [  16,  -4,  12,   4,   4,  12,  -4,  16],
    [ -28, -45,  -4,  -3,  -3,  -4, -45, -28],
    [ 100, -28,  16,   8,   8,  16, -28, 100]
];

let othelloState = {
    initialized: false,
    mode: 'normal', // 'easy' | 'normal' | 'hard' | '2p'
    playerColor: 1, // 1 = Black, -1 = White
    board: [], // 8x8 array of 0, 1 (Black), -1 (White)
    turn: 1, // 1 = Black, -1 = White
    lastMove: null, // { r, c }
    flippedCells: new Set(),
    history: [],
    gameOver: false,
    aiThinking: false,
    statusNote: ''
};

export function setOthelloMode(mode) {
    if (!['easy', 'normal', 'hard', '2p'].includes(mode)) return;
    othelloState.mode = mode;
    document.querySelectorAll?.('[data-othello-mode]')?.forEach?.(btn => {
        const active = btn.dataset.othelloMode === mode;
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-pressed', String(active));
    });
    initOthelloGame();
}

export function setOthelloPlayerColor(color) {
    const c = Number(color) === -1 ? -1 : 1;
    othelloState.playerColor = c;
    document.querySelectorAll?.('[data-othello-color]')?.forEach?.(btn => {
        const active = Number(btn.dataset.othelloColor) === c;
        btn.classList?.toggle?.('active', active);
        btn.setAttribute?.('aria-pressed', String(active));
    });
    initOthelloGame();
}

export function initOthelloGame() {
    othelloRevision++;
    othelloState.initialized = true;
    othelloState.board = Array.from({ length: 8 }, () => Array(8).fill(0));
    othelloState.board[3][3] = -1;
    othelloState.board[3][4] = 1;
    othelloState.board[4][3] = 1;
    othelloState.board[4][4] = -1;
    othelloState.turn = 1; // Black always moves first
    othelloState.lastMove = null;
    othelloState.flippedCells = new Set();
    othelloState.history = [];
    othelloState.gameOver = false;
    othelloState.aiThinking = false;
    othelloState.statusNote = '';

    renderOthelloBoard();
    if (othelloState.mode !== '2p' && othelloState.playerColor === -1) {
        triggerOthelloAIMove();
    }
}

function getFlipsForMove(board, r, c, color) {
    if (board[r][c] !== 0) return [];
    const allFlips = [];
    for (const [dr, dc] of OTHELLO_DIRS) {
        const line = [];
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === -color) {
            line.push([nr, nc]);
            nr += dr;
            nc += dc;
        }
        if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === color) {
            allFlips.push(...line);
        }
    }
    return allFlips;
}

function getValidMoves(board, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const flips = getFlipsForMove(board, r, c, color);
            if (flips.length > 0) {
                moves.push({ r, c, flips });
            }
        }
    }
    return moves;
}

function cloneBoard(board) {
    return board.map(row => [...row]);
}

export function playOthelloMove(r, c) {
    if (othelloState.gameOver || othelloState.aiThinking) return;
    if (othelloState.mode !== '2p' && othelloState.turn !== othelloState.playerColor) return;

    const flips = getFlipsForMove(othelloState.board, r, c, othelloState.turn);
    if (flips.length === 0) return;

    // Save snapshot for Undo
    othelloState.history.push({
        board: cloneBoard(othelloState.board),
        turn: othelloState.turn,
        lastMove: othelloState.lastMove ? { ...othelloState.lastMove } : null
    });

    applyOthelloMove(r, c, flips);
}

function applyOthelloMove(r, c, flips) {
    const color = othelloState.turn;
    othelloState.board[r][c] = color;
    const flippedSet = new Set();
    for (const [fr, fc] of flips) {
        othelloState.board[fr][fc] = color;
        flippedSet.add(`${fr},${fc}`);
    }
    othelloState.lastMove = { r, c };
    othelloState.flippedCells = flippedSet;
    othelloState.statusNote = '';

    advanceOthelloTurn();
}

function advanceOthelloTurn() {
    const nextColor = -othelloState.turn;
    const nextMoves = getValidMoves(othelloState.board, nextColor);

    if (nextMoves.length > 0) {
        othelloState.turn = nextColor;
        renderOthelloBoard();
        if (othelloState.mode !== '2p' && othelloState.turn !== othelloState.playerColor) {
            triggerOthelloAIMove();
        }
        return;
    }

    // Next player has no moves — check if current player still has moves
    const currentMoves = getValidMoves(othelloState.board, othelloState.turn);
    if (currentMoves.length > 0) {
        const skippedName = nextColor === 1 ? '黒' : '白';
        othelloState.statusNote = `${skippedName}は置ける場所がないためパスしました！`;
        renderOthelloBoard();
        if (othelloState.mode !== '2p' && othelloState.turn !== othelloState.playerColor) {
            triggerOthelloAIMove();
        }
        return;
    }

    // Neither player can move -> Game Over
    finishOthelloGame();
}

let othelloRevision = 0;

function triggerOthelloAIMove() {
    const revision = othelloRevision;
    othelloState.aiThinking = true;
    renderOthelloBoard();

    setTimeout(() => {
        if (othelloState.gameOver || revision !== othelloRevision) return;
        const aiColor = othelloState.turn;
        const moves = getValidMoves(othelloState.board, aiColor);
        othelloState.aiThinking = false;

        if (moves.length === 0) {
            advanceOthelloTurn();
            return;
        }

        const chosen = selectAIMove(othelloState.board, moves, aiColor, othelloState.mode);
        applyOthelloMove(chosen.r, chosen.c, chosen.flips);
    }, 340);
}

function evaluateOthelloBoard(board, color) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === color) score += OTHELLO_WEIGHTS[r][c];
            else if (board[r][c] === -color) score -= OTHELLO_WEIGHTS[r][c];
        }
    }
    const myMoves = getValidMoves(board, color).length;
    const oppMoves = getValidMoves(board, -color).length;
    score += (myMoves - oppMoves) * 6;
    return score;
}

function selectAIMove(board, moves, aiColor, difficulty) {
    if (difficulty === 'easy') {
        // Easy: pick random or max immediate flips without corner awareness
        return moves[Math.floor(Math.random() * moves.length)];
    }

    if (difficulty === 'normal') {
        // Normal: positional weight + flip count
        let best = moves[0];
        let bestScore = -Infinity;
        for (const m of moves) {
            const val = OTHELLO_WEIGHTS[m.r][m.c] + m.flips.length * 2 + (Math.random() * 4 - 2);
            if (val > bestScore) {
                bestScore = val;
                best = m;
            }
        }
        return best;
    }

    // Hard: 2-ply Minimax with positional + mobility evaluation
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const m of moves) {
        const nextBoard = cloneBoard(board);
        nextBoard[m.r][m.c] = aiColor;
        for (const [fr, fc] of m.flips) nextBoard[fr][fc] = aiColor;

        const oppMoves = getValidMoves(nextBoard, -aiColor);
        let worstReplyScore = Infinity;

        if (oppMoves.length === 0) {
            worstReplyScore = evaluateOthelloBoard(nextBoard, aiColor) + 35;
        } else {
            for (const om of oppMoves) {
                const replyBoard = cloneBoard(nextBoard);
                replyBoard[om.r][om.c] = -aiColor;
                for (const [fr, fc] of om.flips) replyBoard[fr][fc] = -aiColor;
                const evalScore = evaluateOthelloBoard(replyBoard, aiColor);
                if (evalScore < worstReplyScore) {
                    worstReplyScore = evalScore;
                }
            }
        }

        if (worstReplyScore > bestScore) {
            bestScore = worstReplyScore;
            bestMove = m;
        }
    }
    return bestMove;
}

export function undoOthelloMove() {
    if (othelloState.aiThinking || othelloState.history.length === 0) return;
    const snapshot = othelloState.history.pop();
    othelloState.board = snapshot.board;
    othelloState.turn = snapshot.turn;
    othelloState.lastMove = snapshot.lastMove;
    othelloState.flippedCells = new Set();
    othelloState.gameOver = false;
    othelloState.statusNote = '1手戻しました';
    renderOthelloBoard();
}

function finishOthelloGame() {
    othelloState.gameOver = true;
    othelloState.aiThinking = false;
    const { black, white } = countOthelloDiscs();

    if (othelloState.mode !== '2p') {
        const myScore = othelloState.playerColor === 1 ? black : white;
        const aiScore = othelloState.playerColor === 1 ? white : black;
        if (myScore > aiScore) gameStats.othelloRecord.win++;
        else if (myScore < aiScore) gameStats.othelloRecord.loss++;
        else gameStats.othelloRecord.draw++;
        saveGameStats();
    }
    renderOthelloBoard();
}

function countOthelloDiscs() {
    let black = 0;
    let white = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (othelloState.board[r][c] === 1) black++;
            else if (othelloState.board[r][c] === -1) white++;
        }
    }
    return { black, white };
}

function renderOthelloBoard() {
    const boardEl = document.getElementById('othello-board');
    if (!boardEl) return;

    const { black, white } = countOthelloDiscs();
    const total = Math.max(1, black + white);
    const blackPct = Math.round((black / total) * 100);

    const blackCountEl = document.getElementById('othello-black-count');
    const whiteCountEl = document.getElementById('othello-white-count');
    const barFillEl = document.getElementById('othello-ratio-fill');
    const statusEl = document.getElementById('othello-status-msg');
    const recordEl = document.getElementById('othello-record');
    const undoBtn = document.getElementById('othello-undo-btn');

    if (blackCountEl) blackCountEl.textContent = String(black);
    if (whiteCountEl) whiteCountEl.textContent = String(white);
    if (barFillEl?.style) barFillEl.style.width = `${blackPct}%`;
    if (undoBtn) undoBtn.disabled = othelloState.history.length === 0 || othelloState.aiThinking;
    if (recordEl) {
        const { win, loss, draw } = gameStats.othelloRecord;
        recordEl.textContent = `${win}勝 ${loss}敗 ${draw}分`;
    }

    const canHumanClick = !othelloState.gameOver && !othelloState.aiThinking &&
        (othelloState.mode === '2p' || othelloState.turn === othelloState.playerColor);
    const validMoves = canHumanClick ? getValidMoves(othelloState.board, othelloState.turn) : [];
    const validMap = new Map(validMoves.map(m => [`${m.r},${m.c}`, m.flips.length]));

    if (statusEl) {
        if (othelloState.gameOver) {
            if (black > white) statusEl.textContent = `ゲーム終了！ 黒 ${black} - 白 ${white} で【黒の勝ち】です！`;
            else if (white > black) statusEl.textContent = `ゲーム終了！ 黒 ${black} - 白 ${white} で【白の勝ち】です！`;
            else statusEl.textContent = `ゲーム終了！ 黒 ${black} - 白 ${white} で【引き分け】です！`;
        } else if (othelloState.aiThinking) {
            statusEl.textContent = 'AIが思考中です…';
        } else {
            const turnLabel = othelloState.turn === 1 ? '黒の番' : '白の番';
            const suffix = othelloState.statusNote ? ` （${othelloState.statusNote}）` : ` — 置ける場所: ${validMoves.length}ヶ所`;
            statusEl.textContent = `${turnLabel}${suffix}`;
        }
    }

    const cellsHtml = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const val = othelloState.board[r][c];
            const key = `${r},${c}`;
            const flipCount = validMap.get(key) || 0;
            const isLast = othelloState.lastMove && othelloState.lastMove.r === r && othelloState.lastMove.c === c;
            const isFlipped = othelloState.flippedCells.has(key);

            let inner = '';
            if (val === 1 || val === -1) {
                const discClass = val === 1 ? 'disc-black' : 'disc-white';
                inner = `<span class="othello-disc ${discClass} ${isFlipped ? 'is-flipped' : ''} ${isLast ? 'is-last-move' : ''}"></span>`;
            } else if (flipCount > 0) {
                inner = `<span class="othello-valid-hint" title="${flipCount}枚裏返せます">+${flipCount}</span>`;
            }

            cellsHtml.push(`
                <button type="button"
                    class="othello-cell ${flipCount > 0 ? 'is-playable' : ''}"
                    ${flipCount > 0 ? `onclick="playOthelloMove(${r}, ${c})"` : 'disabled'}
                    aria-label="${r + 1}行 ${c + 1}列">
                    ${inner}
                </button>
            `);
        }
    }
    const keepBoardFocus = boardEl.contains(document.activeElement);
    boardEl.innerHTML = cellsHtml.join('');
    if (keepBoardFocus) boardEl.focus({ preventScroll: true });
}

// =========================================================
// Initialization & Global Keyboard / Swipe Listeners
// =========================================================
export function initGames() {
    resetSnakeState();
    initPuzzleBoard(4);
    initOthelloGame();

    const canvas = document.getElementById('snake-canvas');
    if (canvas) {
        let touchStartX = 0;
        let touchStartY = 0;

        canvas.addEventListener('click', () => {
            if (!snakeState.running || snakeState.gameOver || snakeState.paused) {
                startOrToggleSnake();
            }
        });

        canvas.addEventListener('touchstart', (e) => {
            const t = e.touches?.[0];
            if (!t) return;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            const t = e.changedTouches?.[0];
            if (!t) return;
            const dx = t.clientX - touchStartX;
            const dy = t.clientY - touchStartY;
            if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
                if (!snakeState.running || snakeState.gameOver || snakeState.paused) {
                    startOrToggleSnake();
                }
                return;
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                setSnakeDirection(dx > 0 ? 'right' : 'left');
            } else {
                setSnakeDirection(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });
    }

    document.addEventListener('keydown', (event) => {
        const modal = document.getElementById('game-modal');
        if (!modal || !modal.classList.contains('active')) return;

        if (event.isComposing || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        if (activeGame === 'snake') {
            if (event.key === ' ' && event.target.closest?.('button')) return;
            const key = event.key;
            if (['ArrowUp', 'w', 'W'].includes(key)) {
                event.preventDefault();
                setSnakeDirection('up');
            } else if (['ArrowDown', 's', 'S'].includes(key)) {
                event.preventDefault();
                setSnakeDirection('down');
            } else if (['ArrowLeft', 'a', 'A'].includes(key)) {
                event.preventDefault();
                setSnakeDirection('left');
            } else if (['ArrowRight', 'd', 'D'].includes(key)) {
                event.preventDefault();
                setSnakeDirection('right');
            } else if (key === ' ') {
                event.preventDefault();
                startOrToggleSnake();
            }
        } else if (activeGame === 'puzzle' && !puzzleState.solved) {
            const blankIdx = puzzleState.tiles.indexOf(0);
            const size = puzzleState.size;
            const r = Math.floor(blankIdx / size);
            const c = blankIdx % size;
            let targetIdx = -1;
            if (event.key === 'ArrowUp' && r < size - 1) targetIdx = (r + 1) * size + c;
            else if (event.key === 'ArrowDown' && r > 0) targetIdx = (r - 1) * size + c;
            else if (event.key === 'ArrowLeft' && c < size - 1) targetIdx = r * size + (c + 1);
            else if (event.key === 'ArrowRight' && c > 0) targetIdx = r * size + (c - 1);

            if (targetIdx !== -1) {
                event.preventDefault();
                clickPuzzleTile(targetIdx);
            }
        }
    });
}
