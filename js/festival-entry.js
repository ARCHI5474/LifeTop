import {initHiddenTens} from './festival-hunt.js?v=14.0.0';
import {openPagePopup} from './page-popup.js?v=14.0.0';
import {festivalConfig} from './festival-config.js?v=14.0.0';
import {eventWindow,eggNames,updateFestival,discoverEgg} from './festival-model.js?v=14.0.0';

const venue = 'festival.html';
const festivalName = 'LifeTop14 Festival';
const openFestival = () => openPagePopup(venue, festivalName);

function showMessage(message, welcome = false) {
    document.getElementById('festival-pop')?.remove();
    const notice = document.createElement('aside');
    notice.id = 'festival-pop';
    notice.className = 'festival-pop';
    notice.setAttribute('aria-label', welcome ? 'LifeTop 14公開記念' : '記念バッジ');
    notice.innerHTML = '<p role="status"></p><div class="mini-tools"><a class="tonal-btn" href="festival.html"></a><button type="button" class="text-btn">閉じる</button></div>';
    notice.querySelector('p').textContent = message;
    const link = notice.querySelector('a');
    link.textContent = welcome ? 'Festivalを見る' : '記念品を見る';
    link.onclick = event => {
        event.preventDefault();
        openFestival();
        notice.remove();
    };
    notice.querySelector('button').onclick = () => notice.remove();
    (document.querySelector('#settings-panel.active') || document.body).append(notice);
    if (!welcome) setTimeout(() => notice.remove(), 7000);
}

function addSecret(host, label, description, handler) {
    if (!host) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'festival-secret';
    button.textContent = label;
    button.title = description;
    button.setAttribute('aria-label', description);
    button.onclick = handler;
    host.append(button);
    return button;
}

async function discoverBadge(id) {
    try {
        await updateFestival(state => discoverEgg(state, festivalConfig, id));
        showMessage('10の秘密を発見！「' + eggNames[id] + '」バッジを獲得しました。');
    } catch (error) {
        showMessage(error.message);
    }
}

function addBanner(home) {
    if (!home) return null;
    const banner = document.createElement('section');
    banner.className = 'festival-banner';
    banner.setAttribute('aria-label', festivalName + ' 開催中');
    banner.hidden = true;
    banner.innerHTML = '<div class="festival-banner-copy"><h2>LifeTop14 Festival</h2><p class="festival-banner-time"></p></div><a class="primary-btn festival-banner-cta" href="festival.html">参加する</a>';
    banner.querySelector('a').onclick = event => {
        event.preventDefault();
        openFestival();
    };
    home.before(banner);
    return banner;
}

function formatRemaining(end) {
    const seconds = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const days = Math.floor(seconds / 86400);
    const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
        .map(value => String(value).padStart(2, '0')).join(':');
    return '終了まで ' + days + '日 ' + clock + ' · 無料 / 登録不要';
}

export function initFestivalEntry() {
    if (document.querySelector('[data-festival-entry-ready]')) return;
    if (festivalConfig.edition !== 14) initHiddenTens(festivalConfig);
    const entrance = document.querySelector('.settings-about') || document.querySelector('.mini-header');
    if (entrance) {
        const link = document.createElement('a');
        link.href = venue;
        link.className = 'text-btn festival-entry';
        link.dataset.festivalEntryReady = 'true';
        link.textContent = festivalName;
        link.onclick = event => {
            event.preventDefault();
            openFestival();
        };
        entrance.append(link);
        if (festivalConfig.edition !== 14) addSecret(entrance, '10', 'LifeTop 14の歓迎メッセージ', () => {
            if (eventWindow(festivalConfig).phase === 'active') showMessage('Welcome to LifeTop 14!', true);
            else openFestival();
        });
    }

    const memories = document.querySelector('[data-festival-memories]');
    if (memories) memories.onclick = event => {
        event.preventDefault();
        openPagePopup(memories.href, memories.textContent);
    };

    const banner = addBanner(document.querySelector('.hero-section'));
    const countdown = banner?.querySelector('.festival-banner-time');
    if (festivalConfig.edition === 14) {
        const refreshBanner = () => {
            const current = eventWindow(festivalConfig);
            if (banner) banner.hidden = current.phase !== 'active';
            if (countdown && current.phase === 'active') countdown.textContent = formatRemaining(current.end);
        };
        refreshBanner();
        if (countdown) setInterval(refreshBanner, 1000);
        return;
    }
    let phase;
    let secrets = [];
    function refresh() {
        const current = eventWindow(festivalConfig);
        if (current.phase !== phase) {
            phase = current.phase;
            if (banner) banner.hidden = phase !== 'active';
            if (phase === 'active') {
                secrets = [
                    addSecret(document.querySelector('.settings-about-version'), 'X', 'バージョン10の秘密', () => void discoverBadge('version')),
                    addSecret(document.querySelector('.mini-header'), '1 + 0', 'Studioの10の秘密', () => void discoverBadge('studio'))
                ].filter(Boolean);
            } else {
                for (const secret of secrets) secret.remove();
                secrets = [];
                document.getElementById('festival-pop')?.remove();
            }
        }
        if (countdown && phase === 'active') countdown.textContent = formatRemaining(current.end);
    }
    refresh();
    if (festivalConfig.startAt || festivalConfig.releaseAt) setInterval(refresh, 1000);
}
