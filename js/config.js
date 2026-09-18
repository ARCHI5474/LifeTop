
/* ========================    
LifeTop v3.1 Codename: "Pleasantly quick"
   ======================== */
const UPDATE_CONFIG = {
    notice: "LifeTop v3.5 一部不具合修正とテーマ追加",
    tag: "LifeTop v3.5" 
};
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
    { name: 'Classic', family: "'Courier Prime', monospace" }
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
    { name: 'マンダリン', bgType: 'gradient-citrus', theme: '#B66A2C' }
];


const searchEngines = {
    google: {
        action: "https://www.google.com/search",
        placeholder: "Google で検索",
        icon: "search"
    },
    bing: {
        action: "https://www.bing.com/search",
        placeholder: "Bing で検索",
        icon: "travel_explore"
    },
    duckduckgo: {
        action: "https://duckduckgo.com/",
        placeholder: "DuckDuckGo で検索",
        icon: "shield_with_heart"
    }
};

// --- 固定ブックマーク（削除不可・フォルダ分け）の定義 ---
const FIXED_BOOKMARKS = {
    "検索関連": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Bing", url: "https://www.bing.com" },
    ],

    "AI関連": [
        { title: "Gemini", url: "https://gemini.google.com" },
        { title: "ChatGPT", url: "https://chatgpt.com" },
        { title: "Claude", url: "https://claude.ai" },
        { title: "Copilot", url: "https://copilot.microsoft.com/" },
        { title: "Perplexity", url: "https://www.perplexity.ai/" },
        { title: "Kinlove", url: "https://kinlove.ai" }
    ],

    "交通": [
        { title: "Googleマップ", url: "https://www.google.co.jp/maps" },
        { title: "Bingマップ", url: "https://www.bing.com/maps" },
        { title: "Y!マップ", url: "https://map.yahoo.co.jp" },
        { title: "NAVITIME", url: "https://www.navitime.co.jp" },
        { title: "Y!路線情報", url: "https://transit.yahoo.co.jp" }
    ],

    "エンタメ&SNS": [
        { title: "YouTube", url: "https://www.youtube.com" },
        { title: "YouTube Music", url: "https://music.youtube.com" },
        { title: "Spotify", url: "https://open.spotify.com" },
        { title: "Netflix", url: "https://www.netflix.com" },
        { title: "ニコニコ", url: "https://www.nicovideo.jp" },
        { title: "TVer", url: "https://tver.jp" },
        { title: "ABEMA", url: "https://abema.tv" },
        { title: "radiko", url: "https://radiko.jp" },
        { title: "DMM", url: "https://www.dmm.com" },
        { title: "Pixiv", url: "https://www.pixiv.net" },
        { title: "Discord", url: "https://discord.com" }
    ],
    "ショッピング": [
        { title: "Amazon", url: "https://www.amazon.co.jp" },
        { title: "ヤフーショッピング", url: "https://shopping.yahoo.co.jp" },
        { title: "楽天市場", url: "https://www.rakuten.co.jp" },
        { title: "メルカリ", url: "https://jp.mercari.com" },
    ],
    "クリエイティブ": [
        { title: "GitHub", url: "https://github.com" },
        { title: "Replit", url: "https://replit.com" },
        { title: "Netlify", url: "https://netlify.com" },
        { title: "Figma", url: "https://figma.com" }
    ],
    "便利ツール": [
        { title: "プールスケッチ", url: "https://plsk.net/" },
        { title: "Writening", url: "https://writening.net/" },
        { title: "Google翻訳", url: "https://translate.google.com/" },
        { title: "ギガファイル便", url: "https://gigafile.nu" },
        { title: "Notion", url: "https://www.notion.so" },
        { title: "GoogleToDo", url: "https://assistant.google.com/tasks" },
        { title: "Googleカレンダー", url: "https://calendar.google.com" },
        { title: "Dropbox", url: "https://www.dropbox.com" },
        { title: "iCloud", url: "https://www.icloud.com" },
        { title: "OneDrive", url: "https://onedrive.live.com" },
        { title: "Googleドライブ", url: "https://drive.google.com/" },
        { title: "マイナポータル", url: "https://myna.go.jp" },
        { title: "25&5TIMER", url: "" },
    ],

    "Pasidea Space": [
        { title: "BrowTop", url: "https://www.hellowork.mhlw.go.jp" },
        { title: "LifeTop", url: "https://kyujinbox.com" },
        { title: "Kinlove", url: "https://kinlove.ai" },
        { title: "25&5TIMER", url: "" },
    ]
};

let userConfig = {
    username: "ゲスト",
    memo: "",
    bookmarks: [
        { title: "Google", url: "https://www.google.com" },
        { title: "YouTube", url: "https://www.youtube.com" },
        { title: "GitHub", url: "https://github.com" }
    ],
    todoList: [
        { id: 1, text: "LifeTopを自分好みに設定する", completed: false }
    ],
    theme: themes[0],
    fontFamily: fontStyles[0].family,
    bgType: "gradient-blue",
    bgImage: "",
    clock12h: false,
    clockShowSec: false,
    searchEngine: "google",
    healthLog: {
        meals: {},
        medications: []
    }
};

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
        // 保存された服薬状況がある場合は、マージ
        mergedHealthLog.medications = defaultHealthLog.medications.map(defMed => {
            const savedMed = parsedHealthLog.medications.find(m => m && m.id === defMed.id);
            return savedMed ? { ...defMed, taken: Boolean(savedMed.taken) } : defMed;
        });
    } else {
        mergedHealthLog.medications = [...defaultHealthLog.medications];
    }

    const safeBookmarks = Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks
            .filter(bookmark => bookmark && typeof bookmark === 'object' && typeof bookmark.title === 'string' && typeof bookmark.url === 'string')
            .map(bookmark => ({ title: bookmark.title, url: bookmark.url }))
        : userConfig.bookmarks;
    const safeTodos = Array.isArray(parsed.todoList)
        ? parsed.todoList
            .filter(todo => todo && typeof todo === 'object' && Number.isSafeInteger(todo.id) && typeof todo.text === 'string')
            .map(todo => ({ id: todo.id, text: todo.text, completed: Boolean(todo.completed) }))
        : userConfig.todoList;
    const safeBackgroundImage = typeof parsed.bgImage === 'string' && (
        /^https:\/\/.+/i.test(parsed.bgImage) ||
        /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(parsed.bgImage)
    ) ? parsed.bgImage : '';

    userConfig = {
        ...userConfig,
        ...parsed,
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
        clock12h: typeof parsed.clock12h === 'boolean' ? parsed.clock12h : userConfig.clock12h,
        clockShowSec: typeof parsed.clockShowSec === 'boolean' ? parsed.clockShowSec : userConfig.clockShowSec,
        searchEngine: Object.hasOwn(searchEngines, parsed.searchEngine)
            ? parsed.searchEngine
            : userConfig.searchEngine,
        calendarEvents: parsed.calendarEvents && typeof parsed.calendarEvents === 'object'
            ? parsed.calendarEvents
            : {},
        healthLog: mergedHealthLog
    };

    delete userConfig.mode;
}

export {
    UPDATE_CONFIG,
    STORAGE_KEY,
    themes,
    fontStyles,
    bgGradients,
    colorCombos,
    searchEngines,
    FIXED_BOOKMARKS,
    userConfig,
    mergeUserConfig
};
