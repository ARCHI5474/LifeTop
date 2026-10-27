/*import { initIcons } from './icons.js?v=4.2.6-official';
import { applyAdvancedSettings, setAdvancedSetting, resetAdvancedSettings } from './advanced.js?v=4.2.2-polish';
import { initProfile } from './profile.js?v=4.2.6-official';
import { initExtraGames } from './extra-games.js?v=4.2.6-official';
import { applyStyles, renderBgSelector } from "./styles.js?v=4.2-expressive";

/* LifeTop - application entry point */
import { userConfig } from "./config.js?v=4.2-expressive";
import { loadData, save } from "./storage.js?v=4.0-final";
import {
    initPickers,
    setTheme,
    setColorCombo,
    setPresetWallpaper,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleSettings,
    toggleHelp,
    
} from "./settings.js?v=4.2.5-audit";
import { updateClock, updateGreeting } from "./clock.js?v=4.0-final";
import { initSearchSuggestions } from "./search.js?v=4.2.5-audit";
import {
    toggleBookmarkEditMode,
    renderBookmarks,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    createBookmarkFolder,
    openBookmarkDialog,
    openFolderDialog,
    switchBookmarkDialogMode,
    closeBookmarkDialog,
    openBookmarkFolder,
    closeBookmarkFolder,
    renameBookmarkFolder,
    moveBookmark,
    reorderBookmark,
    promptMoveToFolder,
    removeBookmarkFromFolder,
    deleteBookmark,
    undoDeleteBookmark,
    handleFaviconLoad,
    handleFaviconError
} from "./bookmarks.js?v=4.2.6-official";
import {
    renderTodoList,
    addTodo,
    toggleTodo,
    toggleTodoPriority,
    clearCompletedTodos,
    deleteTodo,
    setTodoFilter,
    undoDeleteTodo,
    initUtilityTabs,
    switchUtilityTab
} from "./todo.js?v=4.0-final";
import {
    initMemoEditor,
    formatMemo,
    copyMemoContent,
    updateMemoStatus
} from "./memo.js?v=4.0-final";
import {
    initGames,
    toggleGameModal,
    switchGameTab,
    setSnakeMode,
    startOrToggleSnake,
    pauseSnakeGame,
    restartSnakeGame,
    setSnakeDirection,
    setPuzzleSize,
    initPuzzleBoard,
    clickPuzzleTile,
    showPuzzleHint,
    setOthelloMode,
    setOthelloPlayerColor,
    initOthelloGame,
    playOthelloMove,
    undoOthelloMove
} from "./games.js?v=4.2.6-official";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js?v=4.2.5-audit";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=4.0-final";
import { initNews, switchNewsCategory, refreshNews, refreshTrends, switchYoutubeCategory, refreshYoutube } from "./news.js?v=4.0-final";

// HTMLのイベントハンドラーから呼び出す関数
/*Object.assign(window, {
    setAdvancedSetting,
    resetAdvancedSettings,
    switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer,
    stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap,
    openUsernameSettings() {
        if (!document.getElementById('settings-panel').classList.contains('active')) toggleSettings();
        const body = document.querySelector('#settings-panel .settings-body');
        const section = document.getElementById('profile-section');
        body.scrollTop += section.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
        document.getElementById('username-input').focus({ preventScroll: true });
    },
    toggleSettings,
    toggleHelp,
    toggleGameModal,
    switchGameTab,
    setSnakeMode,
    startOrToggleSnake,
    pauseSnakeGame,
    restartSnakeGame,
    setSnakeDirection,
    setPuzzleSize,
    initPuzzleBoard,
    clickPuzzleTile,
    showPuzzleHint,
    setOthelloMode,
    setOthelloPlayerColor,
    initOthelloGame,
    playOthelloMove,
    undoOthelloMove,
    setTheme,
    setColorCombo,
    setPresetWallpaper,
    setFontFamily,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleBookmarkEditMode,
    switchBookmarkTab,
    scrollTabs,
    addBookmark,
    createBookmarkFolder,
    openBookmarkDialog,
    openFolderDialog,
    switchBookmarkDialogMode,
    closeBookmarkDialog,
    openBookmarkFolder,
    closeBookmarkFolder,
    renameBookmarkFolder,
    moveBookmark,
    reorderBookmark,
    promptMoveToFolder,
    removeBookmarkFromFolder,
    deleteBookmark,
    undoDeleteBookmark,
    handleFaviconLoad,
    handleFaviconError,
    switchUtilityTab,
    addTodo,
    toggleTodo,
    toggleTodoPriority,
    clearCompletedTodos,
    deleteTodo,
    setTodoFilter,
    undoDeleteTodo,
    formatMemo,
    copyMemoContent,
    showWeatherDetail,
    closeWeatherDetail,
    switchNewsCategory,
    refreshNews,
    refreshTrends,
    switchYoutubeCategory,
    refreshYoutube,
});

document.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
        if (document.getElementById('game-rules')?.matches(':popover-open')) return;
        if (document.getElementById('weather-detail-modal')?.classList.contains('active')) {
            closeWeatherDetail();
        } else if (document.getElementById('bookmark-dialog')?.classList.contains('active')) {
            closeBookmarkDialog();
        } else if (document.getElementById('game-modal')?.classList.contains('active')) {
            toggleGameModal(false);
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

    initIcons();
    loadData();

    applyStyles();
    renderBookmarks();
    renderTodoList();
    initUtilityTabs();
    initMemoEditor();
    initClockTools();
    initGames();
    renderBgSelector();
    initPickers();
    initProfile();
    initSearchSuggestions();
    applyAdvancedSettings();
    initExtraGames();

    const bookmarkForm = document.getElementById('bookmark-dialog-form');
    bookmarkForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        addBookmark();
    });

    updateClock();
    updateGreeting();

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

        const loadinScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

        const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

        const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

        const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

        const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => loadingScreen.remove(), 200);
    }

    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 1800000);

    fetchWeather();
    setInterval(fetchWeather, 3600000);
    initNews();

});*/
