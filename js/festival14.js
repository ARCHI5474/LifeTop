import {eventWindow, randomInt, updateFestival, readFestival} from './festival-model.js?v=14.0.0';
import {PRIZES, BONUS_EVERY, HUNT_BOARD, festival14Progress, drawAvailability, drawPrize, recordChallenge} from './festival14-model.js?v=14.0.0';

export function initFestival14(config) {
    const $ = id => document.getElementById('festival14-' + id);
    const root = document.getElementById('festival14');
    document.body.dataset.festivalEdition = '14';
    root.hidden = false;
    let state, runningAt = null, busy = false, gameStarted, nextNumber = 1, huntMessage = '';
    const active = () => eventWindow(config).phase === 'active';
    const grid = $('hunt');
    const prizes = $('prizes');

    function numberButton(number) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tonal-btn';
        button.textContent = String(number);
        return button;
    }

    function render() {
        const progress = festival14Progress(state ?? {});
        const playable = Boolean(state) && active();
        if (!playable && runningAt !== null) {
            runningAt = null;
            $('result').textContent = '開催期間が終了しました。';
        }
        const {nextAt, bonus} = drawAvailability(progress, Date.now());
        $('start').disabled = !playable || busy || runningAt !== null;
        $('stop').disabled = !playable || busy || runningAt === null;
        $('draw').disabled = !playable || busy || Date.now() < nextAt;
        $('bonus').disabled = !playable || busy || bonus === 0;
        $('draw-time').textContent = !playable ? '開催期間中に参加できます。'
            : Date.now() < nextAt
                ? '次の記念ガチャ ' + new Date(nextAt).toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'}) + '（日本時間）'
                : '記念ガチャを引けます。';
        $('draw-time').textContent += ' ボーナス残り ' + bonus + '回。';
        const count = progress.draws.filter(draw => !draw.bonus).length;
        $('points').textContent = '合計 ' + progress.points + ' pt · 記念ガチャ ' + count + '回（' + (count % BONUS_EVERY) + ' / ' + BONUS_EVERY + '）';
        for (const [index, button] of [...grid.children].entries()) {
            const found = progress.found.includes(index);
            button.disabled = !playable || found;
            button.setAttribute('aria-label', HUNT_BOARD[index] + (found ? '、発見済み' : ''));
            button.toggleAttribute('data-found', found);
        }
        const foundText = huntMessage || progress.found.length + ' / 4 発見' + (progress.found.length === 4 ? '。すべて見つけました！' : '');
        if ($('found').textContent !== foundText) $('found').textContent = foundText;
        $('best').textContent = progress.best === null ? '' : 'ベスト ' + (progress.best / 100).toFixed(2) + '秒';
        $('secret').hidden = !progress.draws.some(draw => draw.prize === 'game');
        for (const [index, item] of [...prizes.children].entries()) {
            const count = progress.draws.filter(draw => draw.prize === PRIZES[index].id).length;
            item.querySelector('output').textContent = count ? '獲得 ' + count + '回' : '未獲得';
        }
    }

    async function change(target, action) {
        if (busy) return;
        busy = true;
        render();
        try {
            state = await updateFestival(record => {
                if (!active()) throw Error('イベント開催期間外です。');
                record.festival14 ??= festival14Progress(record);
                action(record.festival14);
            });
            return true;
        } catch (error) {
            target.textContent = error.message;
            return false;
        } finally {
            busy = false;
            render();
        }
    }

    for (const [index, number] of HUNT_BOARD.entries()) {
        const button = numberButton(number);
        button.onclick = () => {
            if (number !== 14) {
                huntMessage = 'ここは「' + number + '」です。';
                render();
                return;
            }
            huntMessage = '';
            void change($('found'), progress => {
                if (!progress.found.includes(index)) progress.found.push(index);
            });
        };
        grid.append(button);
    }

    for (const prize of PRIZES) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        const description = document.createElement('span');
        const count = document.createElement('output');
        name.textContent = prize.name;
        description.textContent = prize.description;
        item.append(name, description, count);
        prizes.append(item);
    }

    $('start').onclick = () => {
        runningAt = performance.now();
        $('result').textContent = '計測中。14秒だと思ったらストップ！';
        render();
        $('stop').focus();
    };
    $('stop').onclick = async () => {
        if (runningAt === null) return;
        const elapsed = performance.now() - runningAt;
        runningAt = null;
        let result;
        const saved = await change($('result'), progress => { result = recordChallenge(progress, elapsed); });
        if (saved) $('result').textContent = (result / 100).toFixed(2) + '秒' + (result === 1400 ? '。14 ptを獲得しました！' : '。もう一度挑戦できます。');
        $('start').focus();
    };

    for (const [id, bonus] of [['draw',false], ['bonus',true]]) {
        $(id).onclick = async () => {
            let prize;
            const saved = await change($('draw-result'), progress => { prize = drawPrize(progress, Date.now(), bonus, randomInt); });
            if (saved) $('draw-result').textContent = prize.name + 'を獲得しました。' + prize.description + '。';
        };
    }

    $('game-start').onclick = () => {
        nextNumber = 1;
        const game = $('game');
        game.replaceChildren();
        const numbers = Array.from({length:14}, (_, index) => index + 1);
        for (let index = numbers.length - 1; index > 0; index--) {
            const other = randomInt(index + 1);
            [numbers[index], numbers[other]] = [numbers[other], numbers[index]];
        }
        for (const number of numbers) {
            const button = numberButton(number);
            button.onclick = () => {
                if (number !== nextNumber) {
                    $('game-result').textContent = '次は「' + nextNumber + '」です。';
                    return;
                }
                button.disabled = true;
                nextNumber++;
                if (nextNumber === 15) {
                    $('game-result').textContent = 'クリア！ ' + ((performance.now() - gameStarted) / 1000).toFixed(2) + '秒';
                    $('game-start').focus();
                } else {
                    const choices = [...game.querySelectorAll('button:not(:disabled)')];
                    (choices.find(choice => Number(choice.textContent) > number) ?? choices[0])?.focus();
                }
            };
            game.append(button);
        }
        $('game-result').textContent = '1から順に選んでください。';
        gameStarted = performance.now();
        game.firstElementChild.focus();
    };

    async function refresh() {
        try {
            state = await readFestival();
        } catch (error) {
            $('draw-result').textContent = error.message;
        }
        render();
    }
    void refresh();
    window.addEventListener('focus', () => void refresh());
    document.addEventListener('festival:restored', () => void refresh());
    setInterval(render, 1000);
}
