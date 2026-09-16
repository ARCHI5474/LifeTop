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
import { initSearchSuggestions } from "./search.js";
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
    switchUtilityTab
} from "./todo.js";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js";

// HTMLのイベントハンドラーから呼び出す関数
Object.assign(window, {
    toggleSettings,
    setTheme,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleBookmarkEditMode,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    deleteBookmark,
    handleFaviconLoad,
    handleFaviconError,
    switchUtilityTab,
    addTodo,
    toggleTodo,
    deleteTodo,
    showWeatherDetail,
    closeWeatherDetail,
});

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
});

window.addEventListener('appinstalled', () => {
    console.log('LifeTop was installed.');
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
});

window.addEventListener('load', () => {
    loadData();

    applyStyles();
    renderBookmarks();
    renderTodoList();
    renderBgSelector();
    initPickers();
    initSearchSuggestions();

    updateClock();
    updateGreeting();

    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 1800000);

    fetchWeather();
    setInterval(fetchWeather, 3600000);

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

document.getElementById('memo-area').addEventListener('input', () => {
    userConfig.memo = document.getElementById('memo-area').value;
    save();
});
