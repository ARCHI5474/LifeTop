/* LifeTop - search engine controls */
import { searchEngines, userConfig } from "./config.js";
import { save } from "./storage.js";

// 検索エンジンの制御
export function toggleSearchEngines(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('engines-dropdown');
    dropdown.classList.toggle('active');
}

export function selectEngine(key, isSave = true) {
    const engine = searchEngines[key] || searchEngines.google;
    userConfig.searchEngine = key;
    if (isSave) save();
    
    const form = document.getElementById('search-form');
    const bar = form.querySelector('.search-bar');
    const icon = document.getElementById('current-engine-icon');
    
    form.action = engine.action;
    bar.placeholder = engine.placeholder;
    icon.innerText = engine.icon;
    
    document.getElementById('engines-dropdown').classList.remove('active');
}

