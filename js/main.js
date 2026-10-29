import { initIcons } from './icons.js?v=7.0';
import { initMotion } from './motion.js?v=7.0';
import { initLoading } from './loading.js?v=7.0';
import { applyAdvancedSettings, setAdvancedSetting, resetAdvancedSettings } from './advanced.js?v=7.0';
import { initProfile } from './profile.js?v=7.0';
import { initExtraGames } from './extra-games.js?v=7.0';
import { applyStyles, renderBgSelector } from "./styles.js?v=7.0";

/* LifeTop - application entry point */
import { userConfig } from "./config.js?v=7.0";
import { loadData, save } from "./storage.js?v=7.0";
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
    
} from "./settings.js?v=7.0";
import { updateClock, updateGreeting } from "./clock.js?v=7.0";
import { initSearchSuggestions } from "./search.js?v=7.0";
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
} from "./bookmarks.js?v=7.0";
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
} from "./todo.js?v=7.0";
import {
    initMemoEditor,
    formatMemo,
    copyMemoContent,
    updateMemoStatus
} from "./memo.js?v=7.0";
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
} from "./games.js?v=7.0";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js?v=7.0";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=7.0";
import { initNews, switchNewsCategory, refreshNews, refreshTrends, switchYoutubeCategory, refreshYoutube } from "./news.js?v=7.0";

// HTMLのイベントハンドラーから呼び出す関数
Object.assign(window, {
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
    const finishLoading = initLoading();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => registrations.forEach(registration => registration.unregister()))
            .catch(() => {});
    }

    initIcons();
    initMotion();
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

    finishLoading();



    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 1800000);

    fetchWeather();
    setInterval(fetchWeather, 3600000);
    initNews();

});
