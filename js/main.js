import { applyStyles, renderBgSelector } from "./styles.js?v=3.9.24";

/* LifeTop - application entry point */
import { userConfig } from "./config.js?v=3.9.24";
import { loadData, save } from "./storage.js?v=3.9.24";
import {
    initPickers,
    setTheme,
    setColorCombo,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleSettings,
    toggleHelp,
    
} from "./settings.js?v=3.9.24";
import { updateClock, updateGreeting } from "./clock.js?v=3.9.24";
import { initSearchSuggestions } from "./search.js";
import {
    toggleBookmarkEditMode,
    renderBookmarks,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    openBookmarkDialog,
    closeBookmarkDialog,
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
} from "./todo.js?v=3.9.25";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=3.9.25";

// HTMLのイベントハンドラーから呼び出す関数
Object.assign(window, {
    switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer,
    stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap,
    openUsernameSettings() {
        if (!document.getElementById('settings-panel').classList.contains('active')) toggleSettings();
        document.getElementById('username-input').focus();
    },
    toggleSettings,
    toggleHelp,
    setTheme,
    setColorCombo,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleBookmarkEditMode,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    openBookmarkDialog,
    closeBookmarkDialog,
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

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (document.getElementById('weather-detail-modal')?.classList.contains('active')) {
            closeWeatherDetail();
        } else if (document.getElementById('bookmark-dialog')?.classList.contains('active')) {
            closeBookmarkDialog();
        } else if (document.getElementById('settings-panel')?.classList.contains('active')) {
            toggleSettings();
        } else if (document.getElementById('help-modal')?.classList.contains('active')) {
            toggleHelp();
        }
    }
});

window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => registrations.forEach(registration => registration.unregister()))
            .catch(() => {});
    }

    loadData();

    applyStyles();
    renderBookmarks();
    renderTodoList();
    initClockTools();
    renderBgSelector();
    initPickers();
    initSearchSuggestions();

    const bookmarkForm = document.getElementById('bookmark-dialog-form');
    bookmarkForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const title = document.getElementById('bookmark-title-input').value.trim();
        const url = document.getElementById('bookmark-url-input').value.trim();
        if (!title || !url) return;
        addBookmark(title, url);
    });

    updateClock();
    updateGreeting();

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        window.setTimeout(() => loadingScreen.classList.add('is-hidden'), 400);
        window.setTimeout(() => loadingScreen.remove(), 950);
    }

    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 1800000);

    fetchWeather();
    setInterval(fetchWeather, 3600000);

});

document.getElementById('memo-area').addEventListener('input', () => {
    userConfig.memo = document.getElementById('memo-area').value;
    save();
});
