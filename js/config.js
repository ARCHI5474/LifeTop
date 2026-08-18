
/* ========================    
LifeTop v3.1 Codename: "Pleasantly quick"
   ======================== */
const UPDATE_CONFIG = {
    notice: "いつものネットを、ここから。より便利に、より快適に。LifeTopはあなたのブラウザの新しいスタートページです。",
    tag: "LifeTop v3.1" 
};
/* ========================================= */

const STORAGE_KEY = 'lifetop_v1_0_data';
const themes = [
    "#607D8B","#05508d", "#12788a", "#97123e", "#441594", "#c03f18", "#b91616"
];
const fontStyles = [
    { name: 'Standard', family: "'Outfit', sans-serif" },
    { name: 'Digital', family: "'DotGothic16', sans-serif" },
    { name: 'Modern', family: "'Oswald', sans-serif" },
    { name: 'Mono', family: "'Roboto Mono', monospace" },
    { name: 'Classic', family: "'Courier Prime', monospace" }
];

const bgGradients = {
    'gradient-blue': 'linear-gradient(135deg, #202125 0%, #2f3846 100%)',
    'gradient-dark': 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'gradient-sunset': 'linear-gradient(135deg, #440c19 0%, #762f07 50%, #9a5f07 100%)',
    'gradient-aurora': 'linear-gradient(135deg, #3b0d4c 0%, #173b5c 50%, #0d5440 100%)',
    'gradient-cyber': 'linear-gradient(135deg, #f72585 0%, #7209b7 50%, #3f37c9 100%)',
    'gradient-deepsea': 'linear-gradient(135deg, #020024 0%, #090979 35%, #00d4ff 100%)',
};

const unsplashImages = [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1600&q=80"
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
    clock12h: false,
    clockShowSec: false,
    searchEngine: "google",
    // 新機能用データ構造
    calendarEvents: {}, // key: "YYYY-MM-DD", value: [{ id, text }]
    healthLog: {
        medications: [
            { id: 1, name: "朝の薬", taken: false },
            { id: 2, name: "昼の薬", taken: false },
            { id: 3, name: "夜の薬", taken: false }
        ],
        waterMl: 0,
        waterTarget: 2000,
        meals: { morning: "", lunch: "", dinner: "", snack: "" },
        lastUpdatedDate: "" // 日付比較用 (YYYY-MM-DD)
    }
};

function mergeUserConfig(parsed) {
    if (!parsed) return;
    
    // healthLog の安全なディープマージ
    const defaultHealthLog = userConfig.healthLog;
    const parsedHealthLog = parsed.healthLog || {};
    
    const mergedHealthLog = {
        ...defaultHealthLog,
        ...parsedHealthLog,
        meals: {
            ...defaultHealthLog.meals,
            ...(parsedHealthLog.meals || {})
        }
    };
    
    if (parsedHealthLog.medications) {
        // 保存された服薬状況がある場合は、マージ
        mergedHealthLog.medications = defaultHealthLog.medications.map(defMed => {
            const savedMed = parsedHealthLog.medications.find(m => m.id === defMed.id);
            return savedMed ? { ...defMed, ...savedMed } : defMed;
        });
    } else {
        mergedHealthLog.medications = [...defaultHealthLog.medications];
    }

    userConfig = {
        ...userConfig,
        ...parsed,
        calendarEvents: parsed.calendarEvents || {},
        healthLog: mergedHealthLog
    };
}

export {
    UPDATE_CONFIG,
    STORAGE_KEY,
    themes,
    fontStyles,
    bgGradients,
    unsplashImages,
    searchEngines,
    FIXED_BOOKMARKS,
    userConfig,
    mergeUserConfig
};
