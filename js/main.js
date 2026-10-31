import { initIcons } from './icons.js?v=8.0';
import { initMotion } from './motion.js?v=8.0';
import { initLoading } from './loading.js?v=8.0';
import { applyAdvancedSettings, setAdvancedSetting, resetAdvancedSettings } from './advanced.js?v=8.0';
import { initProfile, renderProfile } from './profile.js?v=8.0';
import { initExtraGames } from './extra-games.js?v=8.0';
import { initCasualGames } from './casual-games.js?v=8.0';
import { initDataManagement } from './data-management.js?v=8.0';
import { initCloudSync } from './cloud-sync.js?v=8.0';
import { initSyncExplanation } from './sync-explanation.js?v=8.0';
import { initResponsiveUI } from './responsive-ui.js?v=8.0';
import { initStabilityCheck } from './stability-check.js?v=8.0';
import { applyStyles, renderBgSelector, renderColorCombos, renderBgPresets } from "./styles.js?v=8.0";

/* LifeTop - application entry point */
import { userConfig, mergeUserConfig, fontStyles } from "./config.js?v=8.0";
import { loadData, save } from "./storage.js?v=8.0";
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
    
} from "./settings.js?v=8.0";
import { updateClock, updateGreeting } from "./clock.js?v=8.0";
import { initSearchSuggestions } from "./search.js?v=8.0";
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
    clearBookmarkUndo,
    handleFaviconLoad,
    handleFaviconError
} from "./bookmarks.js?v=8.0";
import {
    renderTodoList,
    addTodo,
    toggleTodo,
    toggleTodoPriority,
    clearCompletedTodos,
    deleteTodo,
    setTodoFilter,
    undoDeleteTodo,
    clearTodoUndo,
    initUtilityTabs,
    switchUtilityTab
} from "./todo.js?v=8.0";
import {
    initMemoEditor,
    syncMemoFromConfig,
    formatMemo,
    copyMemoContent,
    updateMemoStatus
} from "./memo.js?v=8.0";
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
} from "./games.js?v=8.0";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js?v=8.0";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=8.0";
import { initNews, switchNewsCategory, refreshNews, refreshTrends, switchYoutubeCategory, refreshYoutube } from "./news.js?v=8.0";

// HTMLのイベントハンドラーから呼び出す関数
Object.assign(window, {
    setAdvancedSetting,
    resetAdvancedSettings,
    switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer,
    stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap,
    openUsernameSettings() {
        if (!document.getElementById('settings-panel').classList.contains('active')) toggleSettings();
        document.getElementById('settings-tab-profile')?.click();
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
    initResponsiveUI();
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
    initSyncExplanation();
    initStabilityCheck();
    initDataManagement();
    initProfile();
    initSearchSuggestions();
    applyAdvancedSettings();
    initExtraGames();
    initCasualGames();
    void initCloudSync(data => {
        mergeUserConfig(data);
        clearTodoUndo();
        clearBookmarkUndo();
        applyStyles();
        applyAdvancedSettings();
        renderBookmarks();
        renderTodoList();
        syncMemoFromConfig();
        renderBgSelector();
        renderColorCombos();
        renderBgPresets();
        renderProfile();
        document.getElementById('username-input').value = userConfig.username;
        document.getElementById('clock-12h-toggle').checked = userConfig.clock12h;
        document.querySelectorAll('#font-styles .font-btn').forEach((button, index) => button.classList.toggle('active', fontStyles[index].family === userConfig.fontFamily));
        document.getElementById('background-image-url').value = userConfig.bgImage.startsWith('https://') ? userConfig.bgImage : '';
        updateClock();
        updateGreeting();
    });

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
