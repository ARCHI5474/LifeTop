export const DRAW_INTERVAL = 3 * 60 * 60 * 1000;
export const BONUS_EVERY = 3;
export const PRIZES = Object.freeze([
    {id:'points', name:'14 pt', description:'Festivalの得点に14 ptを追加'},
    {id:'sticker', name:'記念ステッカー', description:'コレクションに記念ステッカーを追加'},
    {id:'badge', name:'記念メダル', description:'コレクションに記念メダルを追加'},
    {id:'game', name:'秘密のゲーム', description:'反射神経ゲーム「14タップ」を解放'}
]);
export const HUNT_BOARD = Object.freeze([41, 14, 44, 11, 41, 44, 14, 11, 41, 44, 14, 41, 11, 44, 11, 14]);
const huntTargets = HUNT_BOARD.flatMap((number, index) => number === 14 ? [index] : []);

export function festival14Progress(state) {
    return state.festival14 ?? {points:0, draws:[], found:[], best:null};
}

export function validateFestival14(progress) {
    const validDraw = draw => draw && Number.isFinite(draw.at) && typeof draw.bonus === 'boolean'
        && PRIZES.some(prize => prize.id === draw.prize);
    if (!progress || !Number.isSafeInteger(progress.points) || progress.points < 0
        || !Array.isArray(progress.draws) || !progress.draws.every(validDraw)
        || !Array.isArray(progress.found) || !progress.found.every(index => huntTargets.includes(index))
        || new Set(progress.found).size !== progress.found.length
        || (progress.best !== null && !(Number.isSafeInteger(progress.best) && progress.best >= 0))) {
        throw Error('LifeTop14 Festivalの保存データが不正です。');
    }
}

export function drawAvailability(progress, now) {
    const regular = progress.draws.filter(draw => !draw.bonus);
    const bonuses = progress.draws.length - regular.length;
    return {
        nextAt: regular.length ? Math.max(...regular.map(draw => draw.at)) + DRAW_INTERVAL : now,
        bonus: Math.max(0, Math.floor(regular.length / BONUS_EVERY) - bonuses)
    };
}

export function drawPrize(progress, now, bonus, random) {
    const availability = drawAvailability(progress, now);
    if (bonus ? availability.bonus === 0 : now < availability.nextAt) throw Error('現在はガチャを引けません。');
    const hasGame = progress.draws.some(draw => draw.prize === 'game');
    const index = bonus && !hasGame ? 3 : random(PRIZES.length - 1);
    const prize = PRIZES[index];
    progress.draws.push({at:now, bonus, prize:prize.id});
    if (prize.id === 'points') progress.points += 14;
    return prize;
}

export function recordChallenge(progress, elapsedMs) {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw Error('計測結果が不正です。');
    const centiseconds = Math.round(elapsedMs / 10);
    if (progress.best === null || Math.abs(centiseconds - 1400) < Math.abs(progress.best - 1400)) {
        progress.best = centiseconds;
    }
    if (centiseconds === 1400) progress.points += 14;
    return centiseconds;
}
