import {initModalScroll} from './modal-scroll.js?v=13.0.1';
import { initIcons } from './icons.js?v=13.0.1';
import {initUISystem} from './ui-system.js?v=13.0.1';
import {initCanvas} from './connected-canvas.js?v=13.0.1';
import {initFestivalEntry} from './festival-entry.js?v=13.0.1';
import {initCamera} from './camera.js?v=13.0.1';
import {initLiveHome} from './live-home.js?v=13.0.1';
import {initQuickPanel,showQuickDetails,toggleQuickPanel} from './quick-panel.js?v=13.0.1';
import {initQuickLinks} from './quick-links.js?v=13.0.1';
import {initVersionEggs} from './version-eggs.js?v=13.0.1';
import {openPagePopup} from './page-popup.js?v=13.0.1';
import { initMotion } from './motion.js?v=13.0.1';
import { initLoading } from './loading.js?v=13.0.1';
import { applyAdvancedSettings, setAdvancedSetting, resetAdvancedSettings } from './advanced.js?v=13.0.1';
import { initProfile, renderProfile } from './profile.js?v=13.0.1';
import { initExtraGames } from './extra-games.js?v=13.0.1';
import { initCasualGames } from './casual-games.js?v=13.0.1';
import { initDataManagement } from './data-management.js?v=13.0.1';
import { initCloudSync } from './cloud-sync.js?v=13.0.1';
import { initSyncExplanation } from './sync-explanation.js?v=13.0.1';
import { initResponsiveUI } from './responsive-ui.js?v=13.0.1';
import { initStabilityCheck } from './stability-check.js?v=13.0.1';
import { applyStyles, renderBgSelector, renderColorCombos, renderBgPresets } from "./styles.js?v=13.0.1";
import { openMiniApps } from "./mini-popup.js?v=13.0.1";

/* LifeTop - application entry point */
import { userConfig, mergeUserConfig } from "./config.js?v=13.0.1";
import { loadData, save } from "./storage.js?v=13.0.1";
import {
    initPickers,
    setTheme,
    setColorCombo,
    setPresetWallpaper,
    setFontFamily,
    setClockDesign,
    renderClockDesigns,
    saveUsername,
    toggleClock12h,
    toggleClockSec,
    setBg,
    toggleSettings,
    toggleHelp,
    
} from "./settings.js?v=13.0.1";
import { updateClock, updateGreeting } from "./clock.js?v=13.0.1";
import { initSearchSuggestions } from "./search.js?v=13.0.1";
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
} from "./bookmarks.js?v=13.0.1";
import {
    renderTodoList,
    addTodo,
    toggleTodo,
    deleteTodo,
    undoDeleteTodo,
    clearTodoUndo,
    initUtilityTabs,
    switchUtilityTab
} from "./todo.js?v=13.0.1";
import {
    initMemoEditor,
    syncMemoFromConfig,
    formatMemo,
    copyMemoContent,
    updateMemoStatus
} from "./memo.js?v=13.0.1";
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
} from "./games.js?v=13.0.1";
import { fetchWeather, showWeatherDetail, closeWeatherDetail } from "./weather.js?v=13.0.1";
import { initClockTools, switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer, stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap } from "./clock-tools.js?v=13.0.1";
import { initNews, switchNewsCategory, refreshNews, refreshTrends } from "./news.js?v=13.0.1";

// HTMLのイベントハンドラーから呼び出す関数
Object.assign(window, {
    openPagePopup,
    toggleQuickPanel,
    openQuickAccount() {
        if(!document.getElementById('settings-panel').classList.contains('active'))toggleSettings();
        showQuickDetails('profile');document.querySelector('#settings-panel .settings-body').scrollTop=0;
        const login=document.getElementById('cloud-sync-login');if(!login.hidden)login.focus({preventScroll:true});
    },
    setAdvancedSetting,
    resetAdvancedSettings,
    switchClockToolTab, setTimerPreset, adjustTimer, toggleTimer, resetTimer,
    stopAlarmSound, toggleStopwatch, resetStopwatch, recordLap,
    openUsernameSettings() {
        if (!document.getElementById('settings-panel').classList.contains('active')) toggleSettings();
        showQuickDetails('profile');
        document.getElementById('settings-tab-profile')?.click();
        const body = document.querySelector('#settings-panel .settings-body');
        const section = document.getElementById('profile-section');
        body.scrollTop += section.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
        document.getElementById('username-input').focus({ preventScroll: true });
    },
    toggleSettings,
    toggleHelp,
    openMiniApps,
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
    setClockDesign,
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
    deleteTodo,
    undoDeleteTodo,
    formatMemo,
    copyMemoContent,
    showWeatherDetail,
    closeWeatherDetail,
    switchNewsCategory,
    refreshNews,
    refreshTrends,
});

document.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
        if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
        if (document.getElementById('game-rules')?.matches(':popover-open')) return;
        if (document.getElementById('weather-detail-modal')?.classList.contains('active')) {
            closeWeatherDetail();
        } else if (document.getElementById('bookmark-dialog')?.classList.contains('active')) {
            closeBookmarkDialog();
        } else if (document.getElementById('game-modal')?.classList.contains('active')) {
            toggleGameModal(false);
        } else if (document.getElementById('quick-panel')?.classList.contains('active')) {
            toggleQuickPanel();
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
    initUISystem();
    initQuickPanel();
    initCamera();
    initLiveHome();
    initQuickLinks();
    initVersionEggs();
    document.querySelector('[data-festival-memories]')?.addEventListener('click',event=>{event.preventDefault();openPagePopup('festival.html#memories','FestivalMemories');});
    void initCanvas();
    void initFestivalEntry();

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
        renderClockDesigns();
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

initModalScroll();
