import {fixedBookmarks} from './quick-links-data.js';

/* ========================    
LifeTop v12.0
   ======================== */
const UPDATE_CONFIG = {
    notice: "LifeTop v12.0。カメラと1000件のQuickアクセスを追加。FestivalMemoriesはQuickパネルの詳細から。Festivalは今後も不定期開催します。",
    tag: "LifeTop v12.0"
};
export const APP_VERSION = '12.0.0';
/* ========================================= */

const STORAGE_KEY = 'lifetop_v1_0_data';
const themes = [
    "#3e3f3f", "#7e7e7e",  "#7279c5", "#E040FB", "#1cad67", "#FF2A6D"
];
const fontStyles = [
    { name: 'Standard', family: "'Outfit', sans-serif" },
    { name: 'Digital', family: "'DotGothic16', sans-serif" },
    { name: 'Modern', family: "'Oswald', sans-serif" },
    { name: 'Mono', family: "'Roboto Mono', monospace" },
    { name: 'Classic', family: "'Courier Prime', monospace" },
    { name: 'Retro', family: "'Righteous', sans-serif" },
    { name: 'Elegant', family: "'Cinzel', serif" },
    { name: 'Bold', family: "'Bebas Neue', sans-serif" },
    { name: 'Cyber', family: "'Space Mono', monospace" },
    { name: 'Round', family: "'Comfortaa', sans-serif" }
];

const clockDesigns = [
    {id:'orbit',name:'Orbit',description:'円形目盛り'},
    {id:'minimal',name:'Minimal',description:'余白と数字'},
    {id:'split',name:'Split',description:'分割パネル'},
    {id:'digital',name:'Digital',description:'デジタル表示'},
    {id:'classic',name:'Classic',description:'クラシック'},
    {id:'blueprint',name:'Blueprint',description:'設計図'}
];
const bgGradients = {
    'gradient-blue': '#203A52',
    'gradient-dark': '#292F3A',
    'gradient-sunset': '#4A2930',
    'gradient-aurora': '#23483F',
    'gradient-cyber': '#183D3A',
    'gradient-deepsea': '#263C58',
    'gradient-berry': '#42243B',
    'gradient-citrus': '#4A3B1D',
    'gradient-leaf': '#2B4630',
    'gradient-lavender': '#342A50',
    'gradient-cocoa': '#4A3028',
    'gradient-teal': '#1D4448',
    'gradient-rose': '#4A2737',
    'gradient-indigo': '#2D3159',
    'gradient-plum': '#40253F',
    'gradient-matcha': '#1F3324',
    'gradient-neon': '#112936',
    'gradient-midnight': '#181E38',
    'gradient-sunrise': '#482D20',
    'gradient-cherry': '#441B26'
};


const colorCombos = [
    { name: 'ブルーベリー', bgType: 'gradient-blue', theme: '#2F75A8' },
    { name: 'オリーブ', bgType: 'gradient-dark', theme: '#6C7A3D' },
    { name: 'アプリコット', bgType: 'gradient-sunset', theme: '#A94F45' },
    { name: 'ミント', bgType: 'gradient-aurora', theme: '#2E8B72' },
    { name: 'レモン', bgType: 'gradient-cyber', theme: '#927C2F' },
    { name: 'サクラ', bgType: 'gradient-deepsea', theme: '#A94D68' },
    { name: 'カモミール', bgType: 'gradient-berry', theme: '#A76A3E' },
    { name: 'ラベンダー', bgType: 'gradient-lavender', theme: '#7054A0' },
    { name: 'カカオ', bgType: 'gradient-cocoa', theme: '#936044' },
    { name: 'ユーカリ', bgType: 'gradient-teal', theme: '#327D80' },
    { name: 'ザクロ', bgType: 'gradient-rose', theme: '#A13E5D' },
    { name: 'アイリス', bgType: 'gradient-indigo', theme: '#5C63A8' },
    { name: 'プラム', bgType: 'gradient-plum', theme: '#914D86' },
    { name: 'ローズマリー', bgType: 'gradient-leaf', theme: '#56804A' },
    { name: 'マンダリン', bgType: 'gradient-citrus', theme: '#B66A2C' },
    { name: 'マッチャ', bgType: 'gradient-matcha', theme: '#4E8A56' },
    { name: 'サイバー', bgType: 'gradient-neon', theme: '#22B4BA' },
    { name: 'ミッドナイト', bgType: 'gradient-midnight', theme: '#4962A8' },
    { name: 'サンライズ', bgType: 'gradient-sunrise', theme: '#C27339' },
    { name: 'チェリー', bgType: 'gradient-cherry', theme: '#B53957' }
];

const bgPresets = [
    {
        id: 'starry-alps',
        name: 'アルプスの星空',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-midnight',
        theme: '#4962A8'
    },
    {
        id: 'northern-lights',
        name: 'オーロラの夜空',
        url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-aurora',
        theme: '#2E8B72'
    },
    {
        id: 'mirror-lake',
        name: '静かな湖畔',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-blue',
        theme: '#2F75A8'
    },
    {
        id: 'misty-forest',
        name: '朝霧の針葉樹林',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-matcha',
        theme: '#4E8A56'
    },
    {
        id: 'sunset-ridge',
        name: '夕暮れの稜線',
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-sunrise',
        theme: '#C27339'
    },
    {
        id: 'twilight-coast',
        name: 'トワイライトの海',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-teal',
        theme: '#327D80'
    },
    {
        id: 'night-cityscape',
        name: '夜の摩天楼',
        url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-neon',
        theme: '#22B4BA'
    },
    {
        id: 'spring-blossom',
        name: '桜と春の霞',
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=2400&q=85',
        thumb: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=360&q=75',
        bgType: 'gradient-deepsea',
        theme: '#A94D68'
    }
];


// --- 固定ブックマーク（削除不可・フォルダ分け）の定義 ---
const FIXED_BOOKMARKS = fixedBookmarks;

let userConfig = {
    username: "ゲスト",
    memo: "",
    memoHtml: "",
    bookmarks: [
        { title: "Google", url: "https://www.google.com" },
        { title: "YouTube", url: "https://www.youtube.com" },
        { title: "GitHub", url: "https://github.com" }
    ],
    todoList: [
        { id: 1, text: "LifeTopを自分好みに設定する", completed: false }
    ],
    theme: colorCombos[0].theme,
    fontFamily: fontStyles[0].family,
    bgType: "gradient-blue",
    bgImage: "",
    colorMode: "dark",
    clock12h: false,
    clockShowSec: false,
    clockDesign: 'orbit',
    profileIcon: "person",
    searchShape: "pill",
    reduceMotion: false,
    textSize: 'standard',
    highContrast: false,
    compactLayout: false,
    showNews: true,
    showYoutube: true,
    searchEngine: "google",
    syncTiming: 'every3',
    healthLog: {
        meals: {},
        medications: []
    }
};

// Personal content is kept when resetting preferences.
export const DEFAULT_CONTENT = JSON.parse(JSON.stringify({memo:userConfig.memo, memoHtml:userConfig.memoHtml, bookmarks:userConfig.bookmarks, todoList:userConfig.todoList}));
const DEFAULT_SETTINGS = Object.freeze(Object.fromEntries(
    Object.entries(userConfig).filter(([key, value]) =>
        !['memo', 'memoHtml'].includes(key) && typeof value !== 'object')
));

function mergeUserConfig(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    
    const defaultHealthLog = userConfig.healthLog || { meals: {}, medications: [] };
    const parsedHealthLog = parsed.healthLog && typeof parsed.healthLog === 'object'
        ? parsed.healthLog
        : {};
    
    const mergedHealthLog = {
        ...defaultHealthLog,
        ...parsedHealthLog,
        meals: {
            ...(defaultHealthLog.meals || {}),
            ...(parsedHealthLog.meals || {})
        }
    };
    
    if (Array.isArray(parsedHealthLog.medications)) {
        mergedHealthLog.medications = parsedHealthLog.medications
            .filter(m => m && typeof m === 'object' && !Array.isArray(m))
            .map(savedMed => ({
                ...defaultHealthLog.medications.find(m => m.id === savedMed.id),
                ...savedMed,
                taken: Boolean(savedMed.taken)
            }));
    } else {
        mergedHealthLog.medications = [...defaultHealthLog.medications];
    }

    const sanitizeBookmarkLink = (item) => {
        if (!item || typeof item !== 'object') return null;
        if (typeof item.title !== 'string' || typeof item.url !== 'string') return null;
        return { title: item.title, url: item.url };
    };

    const sanitizeBookmarkEntry = (entry, idx) => {
        if (!entry || typeof entry !== 'object' || typeof entry.title !== 'string') return null;
        if (entry.type === 'folder') {
            const children = Array.isArray(entry.children)
                ? entry.children.map(sanitizeBookmarkLink).filter(Boolean)
                : [];
            const id = typeof entry.id === 'string' && entry.id.trim()
                ? entry.id.trim()
                : `folder_${idx}_${Date.now()}`;
            return {
                id,
                type: 'folder',
                title: entry.title.trim() || 'フォルダ',
                children
            };
        }
        return sanitizeBookmarkLink(entry);
    };

    const safeBookmarks = Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks.map(sanitizeBookmarkEntry).filter(Boolean)
        : userConfig.bookmarks;
    const safeTodos = Array.isArray(parsed.todoList)
        ? parsed.todoList
            .filter(todo => todo && typeof todo === 'object' && Number.isSafeInteger(todo.id) && typeof todo.text === 'string')
            .map(todo => ({
                id: todo.id,
                text: todo.text,
                completed: Boolean(todo.completed),
                description: typeof todo.description === 'string' ? todo.description : '',
                status: todo.completed ? 'done' : todo.status === 'doing' ? 'doing' : 'todo',
                due: typeof todo.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todo.due) ? todo.due : '',
                projectId: typeof todo.projectId === 'string' ? todo.projectId : '',
                fileId: typeof todo.fileId === 'string' ? todo.fileId : '',
                createdAt: Number.isFinite(todo.createdAt) ? todo.createdAt : 0,
                updatedAt: Number.isFinite(todo.updatedAt) ? todo.updatedAt : 0,
                completedAt: todo.completed && Number.isFinite(todo.completedAt) ? todo.completedAt : null,
                ...(todo.priority ? { priority: true } : {})
            }))
        : userConfig.todoList;
    const safeBackgroundImage = typeof parsed.bgImage === 'string' && (
        /^https:\/\/.+/i.test(parsed.bgImage) ||
        /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(parsed.bgImage)
    ) ? parsed.bgImage : '';

    userConfig = {
        ...userConfig,
        ...parsed,
        memo: typeof parsed.memo === 'string' ? parsed.memo : userConfig.memo,
        memoHtml: typeof parsed.memoHtml === 'string' ? parsed.memoHtml : '',
        bookmarks: safeBookmarks,
        todoList: safeTodos,
        theme: themes.includes(parsed.theme) || colorCombos.some(combo => combo.theme === parsed.theme)
            ? parsed.theme
            : userConfig.theme,
        fontFamily: fontStyles.some(font => font.family === parsed.fontFamily)
            ? parsed.fontFamily
            : userConfig.fontFamily,
        bgType: Object.hasOwn(bgGradients, parsed.bgType) ? parsed.bgType : userConfig.bgType,
        bgImage: safeBackgroundImage,
        colorMode: parsed.colorMode === 'light' ? 'light' : 'dark',
        clock12h: typeof parsed.clock12h === 'boolean' ? parsed.clock12h : userConfig.clock12h,
        clockShowSec: typeof parsed.clockShowSec === 'boolean' ? parsed.clockShowSec : userConfig.clockShowSec,
        clockDesign: clockDesigns.some(design => design.id === parsed.clockDesign) ? parsed.clockDesign : 'orbit',
        profileIcon: typeof parsed.profileIcon === 'string' && (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(parsed.profileIcon) || ['person','face','pets','eco','rocket_launch','favorite','star','sports_esports'].includes(parsed.profileIcon)) && parsed.profileIcon.length < 3000000 ? parsed.profileIcon : 'person',
        searchShape: ["pill", "rounded", "square"].includes(parsed.searchShape) ? parsed.searchShape : "pill",
        reduceMotion: parsed.reduceMotion === true,
        textSize: ['standard', 'large', 'larger'].includes(parsed.textSize) ? parsed.textSize : 'standard',
        highContrast: parsed.highContrast === true,
        compactLayout: parsed.compactLayout === true,
        showNews: parsed.showNews !== false,
        showYoutube: parsed.showYoutube !== false,
        searchEngine: ["google", "bing", "duckduckgo", "yahoo"].includes(parsed.searchEngine) ? parsed.searchEngine : "google",
        syncTiming: ['every3','everyVisit','live','manual'].includes(parsed.syncTiming) ? parsed.syncTiming : 'every3',
        calendarEvents: parsed.calendarEvents && typeof parsed.calendarEvents === 'object'
            ? parsed.calendarEvents
            : {},
        healthLog: mergedHealthLog
    };

    delete userConfig.mode;
    delete userConfig.clockTransparency;
    delete userConfig.cardTransparency;
}

export {
    UPDATE_CONFIG,
    STORAGE_KEY,
    themes,
    fontStyles,
    clockDesigns,
    bgGradients,
    colorCombos,
    bgPresets,
    FIXED_BOOKMARKS,
    userConfig,
    DEFAULT_SETTINGS,
    mergeUserConfig
};
