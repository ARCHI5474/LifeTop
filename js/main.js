import { applyStyles, renderBgSelector } from "./styles.js?v=4.0-final";

/* LifeTop - application entry point */
import { userConfig } from "./config.js?v=4.0-final";
import { loadData, save } from "./storage.js?v=4.0-final";
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
    
} from "./settings.js?v=4.0-final";
import { updateClock, updateGreeting } from "./clock.js?v=4.0-final";
import { initSearchSuggestions } from "./search.js?v=4.0-final";
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
} from "./bookmarks.js?v=4.0-final";
import {
    renderTodoList,
    addTodo,
    toggleTodo,
    deleteTodo,
    setTodoFilter,
    undoDeleteTodo,
    initUtilityTabs,
    switchUtilityTab
} from "./todo.js?v=4.0-final";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js?v=4.0-final";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=4.0-final";

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
    setTodoFilter,
    undoDeleteTodo,
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

window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => registrations.forEach(registration => registration.unregister()))
            .catch(() => {});
    }

    loadData();

    applyStyles();
    renderBookmarks();
    renderTodoList();
    initUtilityTabs();
    updateMemoStatus();
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
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 1800000);

    fetchWeather();
    setInterval(fetchWeather, 3600000);

});

document.getElementById('memo-area').addEventListener('input', () => {
    userConfig.memo = document.getElementById('memo-area').value;
    updateMemoStatus(save());
});

function updateMemoStatus(saved) {
    document.getElementById('memo-count').textContent = `${Array.from(document.getElementById('memo-area').value).length.toLocaleString('ja-JP')}文字`;
    if (saved !== undefined) document.getElementById('memo-save-status').textContent = saved ? '保存しました' : '未保存 — 保存設定を確認してください';
}
