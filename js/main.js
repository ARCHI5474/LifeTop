import { applyStyles, renderBgSelector } from "./styles.js";

/* LifeTop - application entry point */
import { userConfig } from "./config.js";
import { loadData, save } from "./storage.js";
import {
    initPickers,
    setTheme,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleSettings
} from "./settings.js";
import { updateClock, updateGreeting } from "./clock.js";
import {
    toggleSearchEngines,
    selectEngine
} from "./search.js";
import {
    toggleBookmarkEditMode,
    renderBookmarks,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    deleteBookmark,
    handleFaviconLoad,
    handleFaviconError
} from "./bookmarks.js";
import {
    renderTodoList,
    addTodo,
    toggleTodo,
    deleteTodo,
    escapeHtml,
    switchUtilityTab
} from "./todo.js";
import {
    fetchWeather,
    getWeatherData,
    parseWeatherCode,
    showWeatherDetail,
    closeWeatherDetail
} from "./weather.js";


/*
 * The original HTML uses inline onclick handlers.
 * Keep those handlers available on window so the HTML does not need
 * to change its behavior.
 */
Object.assign(window, {
    toggleSettings,
    initPickers,
    setTheme,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    updateClock,
    updateGreeting,
    toggleSearchEngines,
    selectEngine,
    toggleBookmarkEditMode,
    renderBookmarks,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    deleteBookmark,
    handleFaviconLoad,
    handleFaviconError,
    switchUtilityTab,
    renderTodoList,
    addTodo,
    toggleTodo,
    deleteTodo,
    escapeHtml,
    fetchWeather,
    getWeatherData,
    parseWeatherCode,

    // 天気詳細
    showWeatherDetail,
    closeWeatherDetail,
});


function simulateV4HeavyLoad() {
    const start = performance.now();
    const duration = 1800; 

    function work() {
        const frameStart = performance.now();

        while (performance.now() - frameStart < 10) {
            Math.sqrt(Math.random() * 1000000);
        }

        if (performance.now() - start < duration) {
            requestAnimationFrame(work);
        }
    }

    requestAnimationFrame(work);
}


let deferredPrompt;


window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('pwa-install-btn');

    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});


window.addEventListener('appinstalled', (evt) => {
    console.log('LifeTop was installed.');

    const installBtn = document.getElementById('pwa-install-btn');

    if (installBtn) {
        installBtn.style.display = 'none';
    }
});


window.addEventListener('load', () => {

    simulateV4HeavyLoad();


    // =========================================================
    // LifeTop起動処理
    // =========================================================

    loadData();

    applyStyles();

    renderBookmarks();

    renderTodoList();

    renderBgSelector();

    initPickers();

    selectEngine(userConfig.searchEngine, false);

    updateClock();

    updateGreeting();


    // 時計
    setInterval(updateClock, 1000);

    // 挨拶
    setInterval(updateGreeting, 1800000);


    // 天気
    fetchWeather();

    setInterval(fetchWeather, 3600000);


    // =========================================================
    // PWA インストールボタン
    // =========================================================

    const installBtn = document.getElementById('pwa-install-btn');

    if (installBtn) {
        installBtn.addEventListener('click', async () => {

            if (!deferredPrompt) return;

            deferredPrompt.prompt();

            const { outcome } = await deferredPrompt.userChoice;

            console.log(`User choice outcome: ${outcome}`);

            deferredPrompt = null;

            installBtn.style.display = 'none';
        });
    }
});


/*
 * メモ欄
 */
document.getElementById('memo-area').addEventListener('input', () => {

    userConfig.memo =
        document.getElementById('memo-area').value;

    save();
});