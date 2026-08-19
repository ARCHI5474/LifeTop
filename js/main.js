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
import { toggleSearchEngines, selectEngine } from "./search.js";
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


/*
 * ============================================================
 * LifeTop v3.2
 * 起動時パフォーマンス負荷テスト
 * ============================================================
 */
function simulateV4HeavyLoad() {
    const start = performance.now();
    const duration = 3000;

    // 一時的なDOMコンテナを作成
    const container = document.createElement("div");

    container.id = "v4-heavy-load";
    container.style.display = "none";

    document.body.appendChild(container);


    /*
     * 大量の一時DOMを生成
     */
    for (let i = 0; i < 3000; i++) {
        const element = document.createElement("div");

        element.className = "v4-temp-element";
        element.textContent = `LifeTop initialization ${i}`;

        container.appendChild(element);
    }


    /*
     * 計算処理
     * 一定時間だけCPU負荷を発生させる
     */
    let result = 0;

    while (performance.now() - start < duration) {
        for (let i = 0; i < 5000; i++) {
            result += Math.sqrt(i * Math.random());
        }
    }


    /*
     * 一時データを削除
     */
    container.remove();


    console.log(
        "LifeTop v4 initialization completed:",
        result
    );
}


let deferredPrompt;


window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();

    deferredPrompt = e;

    const installBtn =
        document.getElementById("pwa-install-btn");

    if (installBtn) {
        installBtn.style.display = "flex";
    }
});


window.addEventListener("appinstalled", (evt) => {
    console.log("LifeTop was installed.");

    const installBtn =
        document.getElementById("pwa-install-btn");

    if (installBtn) {
        installBtn.style.display = "none";
    }
});


window.addEventListener("load", () => {

    /*
     * ========================================================
     * LifeTop v3.2
     * performance stress test on startup
     * ========================================================
     */
    simulateV4HeavyLoad();


    /*
     * ========================================================
     * 通常のLifeTop初期化
     * ========================================================
     */

    loadData();

    applyStyles();

    renderBookmarks();

    renderTodoList();

    renderBgSelector();

    initPickers();

    selectEngine(
        userConfig.searchEngine,
        false
    );

    updateClock();

    updateGreeting();


    /*
     * 時計
     */
    setInterval(updateClock, 1000);


    /*
     * 挨拶
     */
    setInterval(
        updateGreeting,
        1800000
    );


    /*
     * 天気
     */
    fetchWeather();

    setInterval(
        fetchWeather,
        3600000
    );


    /*
     * ========================================================
     * PWA インストールボタン
     * ========================================================
     */

    const installBtn =
        document.getElementById("pwa-install-btn");

    if (installBtn) {

        installBtn.addEventListener(
            "click",
            async () => {

                if (!deferredPrompt) {
                    return;
                }

                deferredPrompt.prompt();

                const { outcome } =
                    await deferredPrompt.userChoice;

                console.log(
                    `User choice outcome: ${outcome}`
                );

                deferredPrompt = null;

                installBtn.style.display = "none";
            }
        );
    }
});


/*
 * ============================================================
 * メモ欄
 * ============================================================
 */

const memoArea =
    document.getElementById("memo-area");

if (memoArea) {

    memoArea.addEventListener(
        "input",
        () => {

            userConfig.memo =
                memoArea.value;

            save();
        }
    );
}