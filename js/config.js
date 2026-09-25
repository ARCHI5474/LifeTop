
/* ========================    
LifeTop v4.0 Codename: "Pleasantly quick"
   ======================== */
const UPDATE_CONFIG = {
    notice: "Quickアクセスが8カテゴリ・160リンクに拡充。暮らしや仕事に役立つサイトをまとめました。",
    tag: "LifeTop ver4.0"
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
    { name: 'Classic', family: "'Courier Prime', monospace" },
    { name: 'Retro', family: "'Righteous', sans-serif" },
    { name: 'Elegant', family: "'Cinzel', serif" },
    { name: 'Bold', family: "'Bebas Neue', sans-serif" },
    { name: 'Cyber', family: "'Space Mono', monospace" },
    { name: 'Round', family: "'Comfortaa', sans-serif" }
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


// --- 固定ブックマーク（削除不可・フォルダ分け）の定義 ---
const FIXED_BOOKMARKS = {
    "検索関連": [
        { title: "Google", url: "https://www.google.com/" },
        { title: "Yahoo! JAPAN", url: "https://www.yahoo.co.jp/" },
        { title: "Bing", url: "https://www.bing.com/" },
        { title: "DuckDuckGo", url: "https://duckduckgo.com/" },
        { title: "Google画像検索", url: "https://images.google.com/" },
        { title: "Googleニュース", url: "https://news.google.com/?hl=ja&gl=JP&ceid=JP:ja" },
        { title: "Google Scholar", url: "https://scholar.google.co.jp/" },
        { title: "Googleブックス", url: "https://books.google.co.jp/" },
        { title: "Googleトレンド", url: "https://trends.google.co.jp/trends/" },
        { title: "Wikipedia", url: "https://ja.wikipedia.org/" },
        { title: "Weblio辞書", url: "https://www.weblio.jp/" },
        { title: "コトバンク", url: "https://kotobank.jp/" },
        { title: "英辞郎 on the WEB", url: "https://eow.alc.co.jp/" },
        { title: "漢字ペディア", url: "https://www.kanjipedia.jp/" },
        { title: "国立国会図書館サーチ", url: "https://ndlsearch.ndl.go.jp/" },
        { title: "CiNii Research", url: "https://cir.nii.ac.jp/" },
        { title: "J-STAGE", url: "https://www.jstage.jst.go.jp/browse/-char/ja" },
        { title: "カーリル", url: "https://calil.jp/" },
        { title: "価格.com", url: "https://kakaku.com/" },
        { title: "食べログ", url: "https://tabelog.com/" }
    ],

    "AI関連": [
        { title: "Gemini", url: "https://gemini.google.com/" },
        { title: "ChatGPT", url: "https://chatgpt.com/" },
        { title: "Claude", url: "https://claude.ai/" },
        { title: "Copilot", url: "https://copilot.microsoft.com/" },
        { title: "Perplexity", url: "https://www.perplexity.ai/" },
        { title: "Kinlove", url: "https://kinlove.ai/" },
        { title: "NotebookLM", url: "https://notebooklm.google.com/" },
        { title: "Google AI Studio", url: "https://aistudio.google.com/" },
        { title: "Felo", url: "https://felo.ai/ja/" },
        { title: "天秤AI", url: "https://tenbin.ai/" },
        { title: "Grok", url: "https://grok.com/" },
        { title: "Poe", url: "https://poe.com/" },
        { title: "DeepL翻訳", url: "https://www.deepl.com/ja/translator" },
        { title: "Notta 文字起こし", url: "https://www.notta.ai/ja" },
        { title: "Gamma 資料作成", url: "https://gamma.app/ja" },
        { title: "Canva AI", url: "https://www.canva.com/ja_jp/ai-assistant/" },
        { title: "Adobe Firefly", url: "https://firefly.adobe.com/" },
        { title: "Napkin AI 図解", url: "https://www.napkin.ai/" },
        { title: "Suno 音楽生成", url: "https://suno.com/" },
        { title: "ElevenLabs 音声生成", url: "https://elevenlabs.io/ja" }
    ],

    "交通": [
        { title: "Googleマップ", url: "https://www.google.co.jp/maps" },
        { title: "Bingマップ", url: "https://www.bing.com/maps" },
        { title: "Yahoo!マップ", url: "https://map.yahoo.co.jp/" },
        { title: "NAVITIME", url: "https://www.navitime.co.jp/" },
        { title: "Yahoo!路線情報", url: "https://transit.yahoo.co.jp/" },
        { title: "ジョルダン 乗換案内", url: "https://www.jorudan.co.jp/" },
        { title: "駅探", url: "https://ekitan.com/" },
        { title: "えきねっと", url: "https://www.eki-net.com/" },
        { title: "スマートEX", url: "https://smart-ex.jp/" },
        { title: "JRおでかけネット", url: "https://www.jr-odekake.net/" },
        { title: "JR九州 列車予約", url: "https://www.jrkyushu.co.jp/" },
        { title: "JRサイバーステーション", url: "https://www.jr.cyberstation.ne.jp/" },
        { title: "ANA", url: "https://www.ana.co.jp/" },
        { title: "JAL", url: "https://www.jal.co.jp/" },
        { title: "ドラぷら 高速料金", url: "https://www.driveplaza.com/" },
        { title: "JARTIC 道路交通情報", url: "https://www.jartic.or.jp/" },
        { title: "高速バスネット", url: "https://www.kousokubus.net/" },
        { title: "ハイウェイバスドットコム", url: "https://www.highwaybus.com/" },
        { title: "WILLER 高速バス", url: "https://travel.willer.co.jp/" },
        { title: "タイムズカー", url: "https://share.timescar.jp/" }
    ],

    "エンタメ&SNS": [
        { title: "YouTube", url: "https://www.youtube.com/" },
        { title: "YouTube Music", url: "https://music.youtube.com/" },
        { title: "Spotify", url: "https://open.spotify.com/" },
        { title: "Netflix", url: "https://www.netflix.com/jp/" },
        { title: "ニコニコ", url: "https://www.nicovideo.jp/" },
        { title: "TVer", url: "https://tver.jp/" },
        { title: "ABEMA", url: "https://abema.tv/" },
        { title: "radiko", url: "https://radiko.jp/" },
        { title: "DMM", url: "https://www.dmm.com/" },
        { title: "pixiv", url: "https://www.pixiv.net/" },
        { title: "Discord", url: "https://discord.com/" },
        { title: "Prime Video", url: "https://www.primevideo.com/" },
        { title: "Disney+", url: "https://www.disneyplus.com/ja-jp" },
        { title: "U-NEXT", url: "https://video.unext.jp/" },
        { title: "X", url: "https://x.com/" },
        { title: "Instagram", url: "https://www.instagram.com/" },
        { title: "TikTok", url: "https://www.tiktok.com/" },
        { title: "LINE", url: "https://www.line.me/ja/" },
        { title: "note", url: "https://note.com/" },
        { title: "Pinterest", url: "https://jp.pinterest.com/" }
    ],

    "ショッピング": [
        { title: "Amazon", url: "https://www.amazon.co.jp/" },
        { title: "楽天市場", url: "https://www.rakuten.co.jp/" },
        { title: "Yahoo!ショッピング", url: "https://shopping.yahoo.co.jp/" },
        { title: "メルカリ", url: "https://jp.mercari.com/" },
        { title: "ヨドバシ.com", url: "https://www.yodobashi.com/" },
        { title: "ビックカメラ.com", url: "https://www.biccamera.com/" },
        { title: "Yahoo!オークション", url: "https://auctions.yahoo.co.jp/" },
        { title: "楽天ラクマ", url: "https://fril.jp/" },
        { title: "Yahoo!フリマ", url: "https://paypayfleamarket.yahoo.co.jp/" },
        { title: "ZOZOTOWN", url: "https://zozo.jp/" },
        { title: "ユニクロ", url: "https://www.uniqlo.com/jp/ja/" },
        { title: "GU", url: "https://www.gu-global.com/jp/ja/" },
        { title: "無印良品", url: "https://www.muji.com/jp/ja/store" },
        { title: "ニトリネット", url: "https://www.nitori-net.jp/" },
        { title: "ロフトネットストア", url: "https://www.loft.co.jp/store/" },
        { title: "ハンズネットストア", url: "https://hands.net/" },
        { title: "アスクル", url: "https://www.askul.co.jp/" },
        { title: "モノタロウ", url: "https://www.monotaro.com/" },
        { title: "価格.com", url: "https://kakaku.com/" },
        { title: "イオンスタイルオンライン", url: "https://aeonretail.com/" }
    ],

    "クリエイティブ": [
        { title: "GitHub", url: "https://github.com/" },
        { title: "Replit", url: "https://replit.com/" },
        { title: "Netlify", url: "https://www.netlify.com/" },
        { title: "Figma", url: "https://www.figma.com/" },
        { title: "Canva", url: "https://www.canva.com/ja_jp/" },
        { title: "Adobe Express", url: "https://www.adobe.com/jp/express/" },
        { title: "Photopea 画像編集", url: "https://www.photopea.com/" },
        { title: "Pixlr 画像編集", url: "https://pixlr.com/jp/" },
        { title: "CLIP STUDIO", url: "https://www.clipstudio.net/ja/" },
        { title: "メディバンペイント", url: "https://medibangpaint.com/" },
        { title: "写真AC", url: "https://www.photo-ac.com/" },
        { title: "イラストAC", url: "https://www.ac-illust.com/" },
        { title: "シルエットAC", url: "https://www.silhouette-ac.com/" },
        { title: "いらすとや", url: "https://www.irasutoya.com/" },
        { title: "O-DAN 写真検索", url: "https://o-dan.net/ja/" },
        { title: "Unsplash", url: "https://unsplash.com/" },
        { title: "Coolors 配色", url: "https://coolors.co/" },
        { title: "Google Fonts", url: "https://fonts.google.com/" },
        { title: "CodePen", url: "https://codepen.io/" },
        { title: "Penpot", url: "https://penpot.app/" }
    ],

    "便利ツール": [
        { title: "プールスケッチ", url: "https://plsk.net/" },
        { title: "Writening", url: "https://writening.net/" },
        { title: "Google翻訳", url: "https://translate.google.com/" },
        { title: "ギガファイル便", url: "https://gigafile.nu/" },
        { title: "Notion", url: "https://www.notion.so/" },
        { title: "Google ToDo", url: "https://tasks.google.com/" },
        { title: "Googleカレンダー", url: "https://calendar.google.com/" },
        { title: "Dropbox", url: "https://www.dropbox.com/" },
        { title: "iCloud", url: "https://www.icloud.com/" },
        { title: "OneDrive", url: "https://onedrive.live.com/" },
        { title: "Googleドライブ", url: "https://drive.google.com/" },
        { title: "Gmail", url: "https://mail.google.com/" },
        { title: "Outlook", url: "https://outlook.live.com/" },
        { title: "Google Keep", url: "https://keep.google.com/" },
        { title: "Googleドキュメント", url: "https://docs.google.com/document/" },
        { title: "Googleスプレッドシート", url: "https://docs.google.com/spreadsheets/" },
        { title: "Googleスライド", url: "https://docs.google.com/presentation/" },
        { title: "iLovePDF", url: "https://www.ilovepdf.com/ja" },
        { title: "Smallpdf", url: "https://smallpdf.com/jp" },
        { title: "高精度計算サイト", url: "https://keisan.site/" }
    ],

    "暮らし・手続き": [
        { title: "マイナポータル", url: "https://myna.go.jp/" },
        { title: "e-Gov電子申請", url: "https://shinsei.e-gov.go.jp/" },
        { title: "e-Tax", url: "https://www.e-tax.nta.go.jp/" },
        { title: "国税庁", url: "https://www.nta.go.jp/" },
        { title: "日本年金機構", url: "https://www.nenkin.go.jp/" },
        { title: "ハローワーク", url: "https://www.hellowork.mhlw.go.jp/" },
        { title: "政府広報オンライン", url: "https://www.gov-online.go.jp/" },
        { title: "消費者庁", url: "https://www.caa.go.jp/" },
        { title: "国民生活センター", url: "https://www.kokusen.go.jp/" },
        { title: "気象庁", url: "https://www.jma.go.jp/" },
        { title: "ハザードマップポータル", url: "https://disaportal.gsi.go.jp/" },
        { title: "NHK防災", url: "https://www.nhk.or.jp/bousai/" },
        { title: "日本郵便", url: "https://www.post.japanpost.jp/" },
        { title: "ヤマト運輸", url: "https://www.kuronekoyamato.co.jp/" },
        { title: "佐川急便", url: "https://www.sagawa-exp.co.jp/" },
        { title: "ごみ・リサイクル（環境省）", url: "https://www.env.go.jp/recycle/" },
        { title: "食の安全（農林水産省）", url: "https://www.maff.go.jp/j/syouan/" },
        { title: "医療情報ネット", url: "https://www.iryou.teikyouseido.mhlw.go.jp/" },
        { title: "こども家庭庁", url: "https://www.cfa.go.jp/" },
        { title: "法テラス", url: "https://www.houterasu.or.jp/" }
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
        searchEngine: "google",
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
    FIXED_BOOKMARKS,
    userConfig,
    mergeUserConfig
};
