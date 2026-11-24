import {icon} from './canvas-ui.js?v=14.0.0';
import {openPagePopup} from './page-popup.js?v=14.0.0';
export function initHomeSummary() {
    const row = document.querySelector('.weather-summary-row');
    if (!row || document.getElementById('home-messages-card')) return;
    row.setAttribute('aria-label', '天気・Messages・カレンダー');
    row.insertAdjacentHTML('beforeend', `<button type="button" id="home-messages-card" class="weather-summary-card glass-card home-summary-card"><span class="home-summary-icon" aria-hidden="true">${icon('forum')}</span><span class="weather-summary-copy"><strong>Messages</strong></span><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button><button type="button" id="home-calendar-card" class="weather-summary-card glass-card home-summary-card"><span class="home-summary-icon" aria-hidden="true">${icon('calendar_month')}</span><span class="weather-summary-copy"><span class="weather-summary-label">カレンダー</span><strong id="home-calendar-date"></strong></span><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>`);
    const update = () => { document.getElementById('home-calendar-date').textContent = new Intl.DateTimeFormat('ja-JP', {month: 'long', day: 'numeric'}).format(new Date()); };
    update(); setInterval(update, 60000);
    document.getElementById('home-messages-card').onclick = () => openPagePopup('messages.html', 'Messages');
    document.getElementById('home-calendar-card').onclick = () => document.dispatchEvent(new CustomEvent('lifetop:calendar-open'));
}
