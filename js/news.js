/* LifeTop - External Feeds Engine (News, Realtime Trends, YouTube Recommendations)
   with 6-Layer Rate-Limit Protection, Cross-Tab Sync & Multi-Provider Fallback */

const NEWS_CACHE_KEY = 'lifetop_news_cache_v1';
const TRENDS_CACHE_KEY = 'lifetop_trends_cache_v1';
const YT_CACHE_KEY = 'lifetop_youtube_cache_v1';
const RATELIMIT_KEY = 'lifetop_feeds_ratelimit_v1';
const LOCK_KEY = 'lifetop_feeds_lock_v1';

// --- API制限対策パラメータ（ガッチガチ保護設定） ---
const NEWS_FRESH_TTL_MS = 30 * 60 * 1000;      // ニュース: 30分間は完全キャッシュ利用（API通信ゼロ）
const TRENDS_FRESH_TTL_MS = 30 * 60 * 1000;    // トレンドワード: 30分間は完全キャッシュ利用（API通信ゼロ）
const YT_FRESH_TTL_MS = 45 * 60 * 1000;        // YouTube動画: 45分間は完全キャッシュ利用（API通信ゼロ）
const MANUAL_COOLDOWN_MS = 3 * 60 * 1000;      // 手動更新ボタンの最短クールダウン（3分）
const FEATURE_MIN_INTERVAL_MS = 8 * 1000;      // 同一機能内の最小リクエスト間隔（8秒）
const MAX_REQUESTS_PER_HOUR = 30;              // 全フィード合算の1時間あたり最大外部リクエスト数上限
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;  // オフライン・制限時のキャッシュ保持上限（24時間）
const LOCK_LEASE_MS = 12 * 1000;               // 複数タブ同時リクエスト防止ロック（12秒）
const FETCH_TIMEOUT_MS = 8000;                 // 1プロバイダあたりのタイムアウト（8秒）

const MAX_NEWS_ITEMS = 6;
const MAX_TREND_ITEMS = 6;
const MAX_YT_ITEMS = 4;

export const NEWS_CATEGORIES = {
    top: {
        label: '主要',
        feeds: [
            { url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', source: 'Yahoo!ニュース' },
            { url: 'https://www.nhk.or.jp/rss/news/cat0.xml', source: 'NHKニュース' }
        ]
    },
    it: {
        label: 'IT・科学',
        feeds: [
            { url: 'https://news.yahoo.co.jp/rss/topics/it.xml', source: 'Yahoo!ニュース (IT)' },
            { url: 'https://www.nhk.or.jp/rss/news/cat3.xml', source: 'NHKニュース (科学・文化)' }
        ]
    },
    business: {
        label: '経済',
        feeds: [
            { url: 'https://news.yahoo.co.jp/rss/topics/business.xml', source: 'Yahoo!ニュース (経済)' },
            { url: 'https://www.nhk.or.jp/rss/news/cat5.xml', source: 'NHKニュース (経済)' }
        ]
    },
    world: {
        label: '国際・社会',
        feeds: [
            { url: 'https://news.yahoo.co.jp/rss/topics/world.xml', source: 'Yahoo!ニュース (国際)' },
            { url: 'https://www.nhk.or.jp/rss/news/cat6.xml', source: 'NHKニュース (国際)' }
        ]
    }
};

export const YT_CATEGORIES = {
    trending: {
        label: '話題・注目',
        usePipedTrending: true,
        channels: [
            { id: 'UC1oPBUWifc0QOOY8DEKhLuQ', name: 'THE FIRST TAKE' },
            { id: 'UCbW18JZRgko_mOGm5er8Yzg', name: 'Nintendo 公式チャンネル' },
            { id: 'UCvpredjG93ifbCP1Y77JyFA', name: 'YouTube Japan 公式' }
        ]
    },
    music: {
        label: '音楽・ライブ',
        usePipedTrending: false,
        channels: [
            { id: 'UC1oPBUWifc0QOOY8DEKhLuQ', name: 'THE FIRST TAKE' },
            { id: 'UCvpredjG93ifbCP1Y77JyFA', name: 'YouTube Japan 公式' }
        ]
    },
    gaming: {
        label: 'ゲーム・エンタメ',
        usePipedTrending: false,
        channels: [
            { id: 'UCbW18JZRgko_mOGm5er8Yzg', name: 'Nintendo 公式チャンネル' },
            { id: 'UC5f1PP62BGAA2wnSSRffb0Q', name: 'PlayStation Japan' }
        ]
    },
    news: {
        label: 'ニュース・解説',
        usePipedTrending: false,
        channels: [
            { id: 'UC6AG81pAkf6Lbi_1VC5NmPA', name: 'TBS NEWS DIG' },
            { id: 'UCGCZAYq5Xxojl_tSXcVJhiQ', name: 'ANNnewsCH' }
        ]
    }
};

let currentCategory = 'top';
let currentYtCategory = 'trending';
const inFlightRequests = new Map();
const tabInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#x27;', '"': '&quot;'
    })[char]);
}

function getSafeUrl(value) {
    try {
        const url = new URL(String(value));
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

function readJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

// --- 汎用キャッシュ読み書き ---
function getBucketCache(storageKey, subKey) {
    const allCache = readJsonStorage(storageKey, {});
    const entry = allCache[subKey];
    if (!entry || !Array.isArray(entry.items) || !entry.items.length || typeof entry.timestamp !== 'number') {
        return null;
    }
    if (Date.now() - entry.timestamp > STALE_MAX_AGE_MS) {
        return null;
    }
    return entry;
}

function setBucketCache(storageKey, subKey, items, providerName) {
    const allCache = readJsonStorage(storageKey, {});
    allCache[subKey] = {
        items,
        provider: providerName || 'cache',
        timestamp: Date.now()
    };
    writeJsonStorage(storageKey, allCache);
}

// --- レート制限・サーキットブレーカー管理 ---
function getRateLimitState() {
    const state = readJsonStorage(RATELIMIT_KEY, {
        history: [],
        lastByFeature: {},
        providers: {}
    });
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    state.history = Array.isArray(state.history)
        ? state.history.filter(ts => typeof ts === 'number' && ts > oneHourAgo)
        : [];
    state.lastByFeature = state.lastByFeature && typeof state.lastByFeature === 'object' ? state.lastByFeature : {};
    state.providers = state.providers && typeof state.providers === 'object' ? state.providers : {};
    return state;
}

function canMakeExternalRequest(featureKey) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { allowed: false, reason: 'オフライン' };
    }
    const state = getRateLimitState();
    const now = Date.now();
    const lastFeatureTs = state.lastByFeature[featureKey] || 0;
    if (now - lastFeatureTs < FEATURE_MIN_INTERVAL_MS) {
        return { allowed: false, reason: '連続アクセス防止中' };
    }
    if (state.history.length >= MAX_REQUESTS_PER_HOUR) {
        return { allowed: false, reason: 'API保護モード（キャッシュ表示）' };
    }
    return { allowed: true };
}

function recordExternalRequest(featureKey) {
    const state = getRateLimitState();
    const now = Date.now();
    state.lastByFeature[featureKey] = now;
    state.history.push(now);
    writeJsonStorage(RATELIMIT_KEY, state);
}

function isProviderHealthy(providerKey) {
    const state = getRateLimitState();
    const info = state.providers[providerKey];
    if (!info || !info.backoffUntil) return true;
    return Date.now() >= info.backoffUntil;
}

function markProviderResult(providerKey, ok, retryAfterSec = 0) {
    const state = getRateLimitState();
    const current = state.providers[providerKey] || { failures: 0, backoffUntil: 0 };
    if (ok) {
        state.providers[providerKey] = { failures: 0, backoffUntil: 0 };
    } else {
        const failures = Math.min(6, (current.failures || 0) + 1);
        const exponentialMs = Math.min(60 * 60 * 1000, 4 * 60 * 1000 * (2 ** (failures - 1)));
        const backoffMs = retryAfterSec > 0 ? Math.max(retryAfterSec * 1000, exponentialMs) : exponentialMs;
        state.providers[providerKey] = {
            failures,
            backoffUntil: Date.now() + backoffMs
        };
    }
    writeJsonStorage(RATELIMIT_KEY, state);
}

// --- クロスタブロック（複数タブ同時起動時の重複リクエスト防止） ---
function acquireCrossTabLock(lockName) {
    const locks = readJsonStorage(LOCK_KEY, {});
    const now = Date.now();
    const existing = locks[lockName];
    if (existing && existing.owner !== tabInstanceId && now - existing.timestamp < LOCK_LEASE_MS) {
        return false;
    }
    locks[lockName] = { owner: tabInstanceId, timestamp: now };
    writeJsonStorage(LOCK_KEY, locks);
    return true;
}

function releaseCrossTabLock(lockName) {
    const locks = readJsonStorage(LOCK_KEY, {});
    if (locks[lockName]?.owner === tabInstanceId) {
        delete locks[lockName];
        writeJsonStorage(LOCK_KEY, locks);
    }
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// --- 汎用CORSプロキシ経由でのXML取得 ---
async function fetchXmlWithProxyFallback(targetUrl) {
    const proxyProviders = [
        {
            key: 'allorigins',
            fetchFn: async () => {
                const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
                if (res.status === 429) { markProviderResult('allorigins', false, 900); throw new Error('429'); }
                if (!res.ok) { markProviderResult('allorigins', false); throw new Error(`HTTP ${res.status}`); }
                const data = await res.json();
                if (!data?.contents) throw new Error('Empty contents');
                markProviderResult('allorigins', true);
                return { xml: data.contents, provider: 'allorigins' };
            }
        },
        {
            key: 'codetabs',
            fetchFn: async () => {
                const res = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`);
                if (res.status === 429) { markProviderResult('codetabs', false, 900); throw new Error('429'); }
                if (!res.ok) { markProviderResult('codetabs', false); throw new Error(`HTTP ${res.status}`); }
                const xml = await res.text();
                if (!xml) throw new Error('Empty xml');
                markProviderResult('codetabs', true);
                return { xml, provider: 'codetabs' };
            }
        }
    ];

    for (const p of proxyProviders) {
        if (!isProviderHealthy(p.key)) continue;
        try {
            return await p.fetchFn();
        } catch {
            // 次のプロキシへ
        }
    }
    throw new Error('XML proxies unavailable');
}

// ====================================================
// 1. Quickニュース取得ロジック
// ====================================================
function parseRssXml(xmlText, defaultSource) {
    if (typeof DOMParser === 'undefined') return [];
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const channelTitle = doc.querySelector('channel > title')?.textContent?.trim() || defaultSource;
    const itemNodes = [...doc.querySelectorAll('item')];
    return itemNodes.map(node => {
        const title = node.querySelector('title')?.textContent?.trim() || '';
        const link = getSafeUrl(node.querySelector('link')?.textContent?.trim() || '');
        const pubDate = node.querySelector('pubDate, dc\\:date, date')?.textContent?.trim() || '';
        const source = node.querySelector('source')?.textContent?.trim() || channelTitle?.split(/[｜|-]/)[0]?.trim() || defaultSource;
        return { title, url: link, pubDate, source };
    }).filter(item => item.title && item.url).slice(0, MAX_NEWS_ITEMS);
}

async function fetchViaRss2Json(feedUrl, defaultSource) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(apiUrl);
    if (res.status === 429) {
        const retryAfter = Number(res.headers?.get?.('Retry-After')) || 900;
        markProviderResult('rss2json', false, retryAfter);
        throw new Error('Rate limited (429)');
    }
    if (!res.ok) {
        markProviderResult('rss2json', false);
        throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data?.status !== 'ok' || !Array.isArray(data.items)) {
        markProviderResult('rss2json', false);
        throw new Error('Invalid rss2json payload');
    }
    markProviderResult('rss2json', true);
    return data;
}

async function fetchNewsCategoryFromNetwork(category) {
    const catConfig = NEWS_CATEGORIES[category] || NEWS_CATEGORIES.top;
    recordExternalRequest('news');

    for (const feed of catConfig.feeds) {
        if (isProviderHealthy('rss2json')) {
            try {
                const data = await fetchViaRss2Json(feed.url, feed.source);
                const items = data.items.map(item => ({
                    title: String(item.title || '').trim(),
                    url: getSafeUrl(item.link || item.url),
                    pubDate: item.pubDate || '',
                    source: data.feed?.title?.split(/[｜|-]/)[0]?.trim() || feed.source
                })).filter(item => item.title && item.url).slice(0, MAX_NEWS_ITEMS);
                if (items.length) return { items, provider: 'rss2json' };
            } catch {
                // フォールバック
            }
        }
        try {
            const { xml, provider } = await fetchXmlWithProxyFallback(feed.url);
            const items = parseRssXml(xml, feed.source);
            if (items.length) return { items, provider };
        } catch {
            // 次のフィードへ
        }
    }
    throw new Error('All news providers unavailable');
}

// ====================================================
// 2. リアルタイム話題のワード取得ロジック
// ====================================================
function parseGoogleTrendsXml(xmlText) {
    if (typeof DOMParser === 'undefined') return [];
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const items = [...doc.querySelectorAll('item')];
    return items.map(node => {
        const keyword = node.querySelector('title')?.textContent?.trim() || '';
        const trafficNode = node.getElementsByTagName('ht:approx_traffic')[0] || node.getElementsByTagName('approx_traffic')[0];
        const newsTitleNode = node.getElementsByTagName('ht:news_item_title')[0] || node.getElementsByTagName('news_item_title')[0];
        const traffic = trafficNode?.textContent?.trim() || '急上昇';
        const context = newsTitleNode?.textContent?.replace(/&nbsp;/g, ' ')?.trim() || '';
        return {
            keyword,
            badge: traffic.includes('+') ? `${traffic} 検索` : traffic,
            context,
            url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
        };
    }).filter(item => item.keyword).slice(0, MAX_TREND_ITEMS);
}

async function fetchWikimediaMostReadJapan() {
    if (!isProviderHealthy('wikimedia')) throw new Error('Wikimedia in backoff');
    // Wikimedia Featured Feed API (CORS完全対応・公式REST API)
    const datesToTry = [0, 1].map(daysAgo => {
        const d = new Date(Date.now() - daysAgo * 86400000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd}`;
    });

    for (const datePath of datesToTry) {
        try {
            const res = await fetchWithTimeout(`https://ja.wikipedia.org/api/rest_v1/feed/featured/${datePath}`);
            if (res.status === 429) {
                markProviderResult('wikimedia', false, 900);
                throw new Error('429');
            }
            if (!res.ok) continue;
            const data = await res.json();
            const articles = data?.mostread?.articles;
            if (!Array.isArray(articles)) continue;
            const filtered = articles
                .filter(a => a && a.titles?.normalized && !/^(メインページ|特別:|Wikipedia:|Portal:|ファイル:)/.test(a.titles.normalized))
                .slice(0, MAX_TREND_ITEMS)
                .map(a => {
                    const keyword = a.titles.normalized;
                    const views = typeof a.views === 'number' ? `${a.views.toLocaleString('ja-JP')} 閲覧` : '注目ワード';
                    return {
                        keyword,
                        badge: views,
                        context: a.description || a.extract?.slice(0, 48) || 'リアルタイム注目トピック',
                        url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
                    };
                });
            if (filtered.length >= 4) {
                markProviderResult('wikimedia', true);
                return { items: filtered, provider: 'wikimedia' };
            }
        } catch {
            // 次の日付へ
        }
    }
    markProviderResult('wikimedia', false);
    throw new Error('Wikimedia mostread unavailable');
}

async function fetchTrendsFromNetwork() {
    recordExternalRequest('trends');
    const trendRssUrls = [
        'https://trends.google.co.jp/trending/rss?geo=JP',
        'https://trends.google.com/trending/rss?geo=JP'
    ];

    // 1. Google Trends RSS (XMLプロキシ経由でネイティブ解析)
    for (const rssUrl of trendRssUrls) {
        try {
            const { xml, provider } = await fetchXmlWithProxyFallback(rssUrl);
            const items = parseGoogleTrendsXml(xml);
            if (items.length >= 3) {
                return { items, provider };
            }
        } catch {
            // 次へ
        }
        if (isProviderHealthy('rss2json')) {
            try {
                const data = await fetchViaRss2Json(rssUrl, 'Google Trends');
                const items = (data.items || []).map(item => {
                    const keyword = String(item.title || '').trim();
                    return {
                        keyword,
                        badge: '急上昇ワード',
                        context: String(item.description || '').replace(/<[^>]*>/g, '').trim() || 'Google 検索トレンド',
                        url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
                    };
                }).filter(item => item.keyword).slice(0, MAX_TREND_ITEMS);
                if (items.length >= 3) return { items, provider: 'rss2json' };
            } catch {
                // 次へ
            }
        }
    }

    // 2. フォールバック: Wikimedia日本語版 公式トレンドAPI（プロキシ不要・直接CORS対応）
    return await fetchWikimediaMostReadJapan();
}

// ====================================================
// 3. YouTubeおすすめ動画取得ロジック
// ====================================================
function extractYoutubeVideoId(inputStr) {
    if (!inputStr) return '';
    const str = String(inputStr);
    const matchWatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (matchWatch) return matchWatch[1];
    const matchShort = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (matchShort) return matchShort[1];
    const matchGuid = str.match(/yt:video:([a-zA-Z0-9_-]{11})/);
    if (matchGuid) return matchGuid[1];
    const matchEmbed = str.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (matchEmbed) return matchEmbed[1];
    return '';
}

function parseYoutubeAtomXml(xmlText, fallbackChannelName) {
    if (typeof DOMParser === 'undefined') return [];
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const channelTitle = doc.querySelector('feed > title')?.textContent?.trim() || fallbackChannelName;
    const entries = [...doc.querySelectorAll('entry')];
    return entries.map(entry => {
        const videoIdNode = entry.getElementsByTagName('yt:videoId')[0] || entry.getElementsByTagName('videoId')[0];
        const linkHref = entry.querySelector('link')?.getAttribute('href') || '';
        const videoId = videoIdNode?.textContent?.trim() || extractYoutubeVideoId(linkHref);
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
        const title = entry.querySelector('title')?.textContent?.trim() || '';
        const channel = entry.querySelector('author > name')?.textContent?.trim() || channelTitle;
        const pubDate = entry.querySelector('published, updated')?.textContent?.trim() || '';
        return {
            videoId,
            title,
            channel,
            pubDate,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`
        };
    }).filter(Boolean);
}

async function fetchPipedTrendingJapan() {
    if (!isProviderHealthy('piped')) throw new Error('Piped in backoff');
    const pipedEndpoints = [
        'https://pipedapi.kavin.rocks/trending?region=JP',
        'https://api.piped.private.coffee/trending?region=JP'
    ];
    for (const endpoint of pipedEndpoints) {
        try {
            const res = await fetchWithTimeout(endpoint);
            if (res.status === 429) {
                markProviderResult('piped', false, 900);
                throw new Error('429');
            }
            if (!res.ok) continue;
            const list = await res.json();
            if (!Array.isArray(list)) continue;
            const items = list.map(v => {
                const videoId = extractYoutubeVideoId(v.url ? `https://www.youtube.com${v.url}` : '');
                if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
                return {
                    videoId,
                    title: String(v.title || '').trim(),
                    channel: String(v.uploaderName || 'YouTube').trim(),
                    pubDate: v.uploaded ? new Date(v.uploaded).toISOString() : '',
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${videoId}`
                };
            }).filter(item => item && item.title).slice(0, MAX_YT_ITEMS);
            if (items.length >= 2) {
                markProviderResult('piped', true);
                return { items, provider: 'piped' };
            }
        } catch {
            // 次のエンドポイントへ
        }
    }
    markProviderResult('piped', false);
    throw new Error('Piped trending unavailable');
}

async function fetchChannelVideos(channel) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.id)}`;
    if (isProviderHealthy('rss2json')) {
        try {
            const data = await fetchViaRss2Json(feedUrl, channel.name);
            const items = (data.items || []).map(item => {
                const videoId = extractYoutubeVideoId(item.link || item.guid);
                if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
                return {
                    videoId,
                    title: String(item.title || '').trim(),
                    channel: String(item.author || data.feed?.title || channel.name).trim(),
                    pubDate: item.pubDate || '',
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${videoId}`
                };
            }).filter(Boolean);
            if (items.length) return { items, provider: 'rss2json' };
        } catch {
            // XMLプロキシへフォールバック
        }
    }
    const { xml, provider } = await fetchXmlWithProxyFallback(feedUrl);
    const items = parseYoutubeAtomXml(xml, channel.name);
    if (!items.length) throw new Error('Empty channel videos');
    return { items, provider };
}

async function fetchYoutubeCategoryFromNetwork(ytCategory) {
    const config = YT_CATEGORIES[ytCategory] || YT_CATEGORIES.trending;
    recordExternalRequest('youtube');

    // 1. 「話題・注目」カテゴリで Piped トレンドAPIが利用可能なら最優先で試行
    if (config.usePipedTrending && isProviderHealthy('piped')) {
        try {
            return await fetchPipedTrendingJapan();
        } catch {
            // 公式チャンネルRSSへフォールバック
        }
    }

    // 2. YouTube公式Atomフィードから取得してマージ
    const collected = [];
    const seenIds = new Set();
    let usedProvider = 'youtube-rss';

    for (const ch of config.channels) {
        try {
            const { items, provider } = await fetchChannelVideos(ch);
            usedProvider = provider;
            for (const video of items.slice(0, 3)) {
                if (!seenIds.has(video.videoId)) {
                    seenIds.add(video.videoId);
                    collected.push(video);
                }
            }
            if (collected.length >= MAX_YT_ITEMS) break;
        } catch {
            // 次のチャンネルへ
        }
    }

    if (collected.length > 0) {
        return { items: collected.slice(0, MAX_YT_ITEMS), provider: usedProvider };
    }
    throw new Error('All YouTube providers unavailable');
}

// ====================================================
// 共通フォーマッタ & UIレンダリング
// ====================================================
function formatRelativeTime(dateInput) {
    if (!dateInput) return '';
    try {
        const normalized = typeof dateInput === 'string' && !dateInput.includes('T')
            ? dateInput.replace(/-/g, '/')
            : dateInput;
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return '';
        const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
        if (diffMin < 1) return 'たった今';
        if (diffMin < 60) return `${diffMin}分前`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}時間前`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
        return '';
    }
}

function formatClockTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function updateFeedStatusUI(statusId, btnId, text, isSpinning = false) {
    const statusEl = document.getElementById(statusId);
    const refreshBtn = document.getElementById(btnId);
    if (statusEl) statusEl.textContent = text;
    if (refreshBtn) {
        refreshBtn.classList?.toggle?.('is-spinning', isSpinning);
        refreshBtn.disabled = isSpinning;
    }
}

// --- ニュース描画 ---
function renderNewsItems(items) {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="news-empty">
                <span class="material-symbols-outlined" aria-hidden="true">newspaper</span>
                <p>ニュース記事を読み込めませんでした。時間をおいて更新してください。</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map((item, idx) => {
        const title = escapeHtml(item.title);
        const url = escapeHtml(getSafeUrl(item.url));
        const source = escapeHtml(item.source || 'ニュース');
        const timeStr = escapeHtml(formatRelativeTime(item.pubDate));
        const staggerIdx = Math.min(idx, 6);
        return `
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-item" style="--news-idx: ${staggerIdx};">
                <div class="news-item-body">
                    <h4 class="news-item-title">${title}</h4>
                    <div class="news-item-meta">
                        <span class="news-source-badge">${source}</span>
                        ${timeStr ? `<span class="news-time">${timeStr}</span>` : ''}
                    </div>
                </div>
                <span class="material-symbols-outlined news-arrow" aria-hidden="true">open_in_new</span>
            </a>
        `;
    }).join('');
}

function renderNewsSkeleton() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: MAX_NEWS_ITEMS }, () => `
        <div class="news-item news-skeleton" aria-hidden="true">
            <div class="news-item-body">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-meta"></div>
            </div>
        </div>
    `).join('');
}

// --- トレンドワード描画 ---
function renderTrendItems(items) {
    const list = document.getElementById('trends-list');
    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = `
            <div class="news-empty">
                <span class="material-symbols-outlined" aria-hidden="true">trending_up</span>
                <p>話題のワードを読み込めませんでした。時間をおいて更新してください。</p>
            </div>
        `;
        return;
    }

    list.innerHTML = items.map((item, idx) => {
        const rank = idx + 1;
        const keyword = escapeHtml(item.keyword);
        const badge = escapeHtml(item.badge || '急上昇');
        const context = escapeHtml(item.context || '');
        const url = escapeHtml(getSafeUrl(item.url) || `https://www.google.com/search?q=${encodeURIComponent(item.keyword || '')}`);
        return `
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="trend-item" style="--news-idx: ${idx};" title="「${keyword}」をGoogleで検索">
                <span class="trend-rank ${rank <= 3 ? 'is-top' : ''}" aria-hidden="true">${rank}</span>
                <div class="trend-body">
                    <div class="trend-keyword-row">
                        <span class="trend-keyword">${keyword}</span>
                        <span class="trend-badge">${badge}</span>
                    </div>
                    ${context ? `<p class="trend-context">${context}</p>` : ''}
                </div>
                <span class="material-symbols-outlined news-arrow" aria-hidden="true">search</span>
            </a>
        `;
    }).join('');
}

function renderTrendsSkeleton() {
    const list = document.getElementById('trends-list');
    if (!list) return;
    list.innerHTML = Array.from({ length: MAX_TREND_ITEMS }, () => `
        <div class="trend-item news-skeleton" aria-hidden="true">
            <div class="news-item-body">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-meta"></div>
            </div>
        </div>
    `).join('');
}

// --- YouTube描画 ---
function renderYoutubeItems(items) {
    const grid = document.getElementById('yt-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="news-empty">
                <span class="material-symbols-outlined" aria-hidden="true">smart_display</span>
                <p>おすすめ動画を読み込めませんでした。時間をおいて更新してください。</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map((item, idx) => {
        const title = escapeHtml(item.title);
        const channel = escapeHtml(item.channel || 'YouTube');
        const url = escapeHtml(getSafeUrl(item.url));
        const thumb = escapeHtml(getSafeUrl(item.thumbnail));
        const timeStr = escapeHtml(formatRelativeTime(item.pubDate));
        return `
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="yt-card-item" style="--news-idx: ${idx};">
                <div class="yt-thumb-wrap">
                    <img src="${thumb}" alt="" loading="lazy" decoding="async" class="yt-thumb">
                    <span class="yt-play-badge" aria-hidden="true">
                        <span class="material-symbols-outlined">play_arrow</span>
                    </span>
                </div>
                <div class="yt-card-body">
                    <h4 class="yt-video-title">${title}</h4>
                    <div class="news-item-meta">
                        <span class="news-source-badge">${channel}</span>
                        ${timeStr ? `<span class="news-time">${timeStr}</span>` : ''}
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

function renderYoutubeSkeleton() {
    const grid = document.getElementById('yt-grid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: MAX_YT_ITEMS }, () => `
        <div class="yt-card-item news-skeleton" aria-hidden="true">
            <div class="yt-thumb-wrap skeleton-line"></div>
            <div class="yt-card-body">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-meta"></div>
            </div>
        </div>
    `).join('');
}

// ====================================================
// 公開アクション & ライフサイクル制御
// ====================================================
export async function loadNews(category = currentCategory, forceManual = false) {
    if (!Object.hasOwn(NEWS_CATEGORIES, category)) category = 'top';
    currentCategory = category;

    const cached = getBucketCache(NEWS_CACHE_KEY, category);
    const now = Date.now();

    if (cached && !forceManual && now - cached.timestamp < NEWS_FRESH_TTL_MS) {
        renderNewsItems(cached.items);
        updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ)`);
        return;
    }

    if (cached && forceManual && now - cached.timestamp < MANUAL_COOLDOWN_MS) {
        const remainMin = Math.max(1, Math.ceil((MANUAL_COOLDOWN_MS - (now - cached.timestamp)) / 60000));
        renderNewsItems(cached.items);
        updateFeedStatusUI('news-status-text', 'news-refresh-btn', `最新キャッシュ表示中（再取得は${remainMin}分後）`);
        return;
    }

    if (cached) renderNewsItems(cached.items);
    else renderNewsSkeleton();

    const rateCheck = canMakeExternalRequest('news');
    if (!rateCheck.allowed) {
        if (cached) updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (${rateCheck.reason})`);
        else { renderNewsItems([]); updateFeedStatusUI('news-status-text', 'news-refresh-btn', rateCheck.reason); }
        return;
    }

    const reqKey = `news:${category}`;
    if (inFlightRequests.has(reqKey)) {
        updateFeedStatusUI('news-status-text', 'news-refresh-btn', '更新中...', true);
        await inFlightRequests.get(reqKey);
        return;
    }

    if (!acquireCrossTabLock(reqKey)) {
        if (cached) updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
        return;
    }

    updateFeedStatusUI('news-status-text', 'news-refresh-btn', '最新ニュースを取得中...', true);

    const promise = (async () => {
        try {
            const result = await fetchNewsCategoryFromNetwork(category);
            setBucketCache(NEWS_CACHE_KEY, category, result.items, result.provider);
            if (currentCategory === category) {
                renderNewsItems(result.items);
                updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(Date.now())} 更新`);
            }
        } catch {
            if (cached && currentCategory === category) {
                renderNewsItems(cached.items);
                updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ保護)`);
            } else if (currentCategory === category) {
                renderNewsItems([]);
                updateFeedStatusUI('news-status-text', 'news-refresh-btn', '取得できませんでした');
            }
        } finally {
            releaseCrossTabLock(reqKey);
            inFlightRequests.delete(reqKey);
            const btn = document.getElementById('news-refresh-btn');
            btn?.classList?.remove?.('is-spinning');
            if (btn) btn.disabled = false;
        }
    })();

    inFlightRequests.set(reqKey, promise);
    await promise;
}

export async function loadTrends(forceManual = false) {
    const subKey = 'jp';
    const cached = getBucketCache(TRENDS_CACHE_KEY, subKey);
    const now = Date.now();

    if (cached && !forceManual && now - cached.timestamp < TRENDS_FRESH_TTL_MS) {
        renderTrendItems(cached.items);
        updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ)`);
        return;
    }

    if (cached && forceManual && now - cached.timestamp < MANUAL_COOLDOWN_MS) {
        const remainMin = Math.max(1, Math.ceil((MANUAL_COOLDOWN_MS - (now - cached.timestamp)) / 60000));
        renderTrendItems(cached.items);
        updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `最新キャッシュ表示中（再取得は${remainMin}分後）`);
        return;
    }

    if (cached) renderTrendItems(cached.items);
    else renderTrendsSkeleton();

    const rateCheck = canMakeExternalRequest('trends');
    if (!rateCheck.allowed) {
        if (cached) updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (${rateCheck.reason})`);
        else { renderTrendItems([]); updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', rateCheck.reason); }
        return;
    }

    const reqKey = 'trends:jp';
    if (inFlightRequests.has(reqKey)) {
        updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', '更新中...', true);
        await inFlightRequests.get(reqKey);
        return;
    }

    if (!acquireCrossTabLock(reqKey)) {
        if (cached) updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
        return;
    }

    updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', 'トレンドを取得中...', true);

    const promise = (async () => {
        try {
            const result = await fetchTrendsFromNetwork();
            setBucketCache(TRENDS_CACHE_KEY, subKey, result.items, result.provider);
            renderTrendItems(result.items);
            updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(Date.now())} 更新`);
        } catch {
            if (cached) {
                renderTrendItems(cached.items);
                updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ保護)`);
            } else {
                renderTrendItems([]);
                updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', '取得できませんでした');
            }
        } finally {
            releaseCrossTabLock(reqKey);
            inFlightRequests.delete(reqKey);
            const btn = document.getElementById('trends-refresh-btn');
            btn?.classList?.remove?.('is-spinning');
            if (btn) btn.disabled = false;
        }
    })();

    inFlightRequests.set(reqKey, promise);
    await promise;
}

export async function loadYoutube(ytCategory = currentYtCategory, forceManual = false) {
    if (!Object.hasOwn(YT_CATEGORIES, ytCategory)) ytCategory = 'trending';
    currentYtCategory = ytCategory;

    const cached = getBucketCache(YT_CACHE_KEY, ytCategory);
    const now = Date.now();

    if (cached && !forceManual && now - cached.timestamp < YT_FRESH_TTL_MS) {
        renderYoutubeItems(cached.items);
        updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ)`);
        return;
    }

    if (cached && forceManual && now - cached.timestamp < MANUAL_COOLDOWN_MS) {
        const remainMin = Math.max(1, Math.ceil((MANUAL_COOLDOWN_MS - (now - cached.timestamp)) / 60000));
        renderYoutubeItems(cached.items);
        updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `最新キャッシュ表示中（再取得は${remainMin}分後）`);
        return;
    }

    if (cached) renderYoutubeItems(cached.items);
    else renderYoutubeSkeleton();

    const rateCheck = canMakeExternalRequest('youtube');
    if (!rateCheck.allowed) {
        if (cached) updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (${rateCheck.reason})`);
        else { renderYoutubeItems([]); updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', rateCheck.reason); }
        return;
    }

    const reqKey = `yt:${ytCategory}`;
    if (inFlightRequests.has(reqKey)) {
        updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', '更新中...', true);
        await inFlightRequests.get(reqKey);
        return;
    }

    if (!acquireCrossTabLock(reqKey)) {
        if (cached) updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
        return;
    }

    updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', 'おすすめ動画を取得中...', true);

    const promise = (async () => {
        try {
            const result = await fetchYoutubeCategoryFromNetwork(ytCategory);
            setBucketCache(YT_CACHE_KEY, ytCategory, result.items, result.provider);
            if (currentYtCategory === ytCategory) {
                renderYoutubeItems(result.items);
                updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(Date.now())} 更新`);
            }
        } catch {
            if (cached && currentYtCategory === ytCategory) {
                renderYoutubeItems(cached.items);
                updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (キャッシュ保護)`);
            } else if (currentYtCategory === ytCategory) {
                renderYoutubeItems([]);
                updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', '取得できませんでした');
            }
        } finally {
            releaseCrossTabLock(reqKey);
            inFlightRequests.delete(reqKey);
            const btn = document.getElementById('yt-refresh-btn');
            btn?.classList?.remove?.('is-spinning');
            if (btn) btn.disabled = false;
        }
    })();

    inFlightRequests.set(reqKey, promise);
    await promise;
}

export function switchNewsCategory(category) {
    if (!Object.hasOwn(NEWS_CATEGORIES, category)) return;
    currentCategory = category;

    document.querySelectorAll?.('#news-tabs .news-tab-btn').forEach(btn => {
        const isTarget = btn.dataset.newsCat === category;
        btn.classList.toggle('active', isTarget);
        btn.setAttribute('aria-selected', String(isTarget));
        btn.tabIndex = isTarget ? 0 : -1;
    });

    loadNews(category, false);
}

export function refreshNews(isManual = true) {
    loadNews(currentCategory, Boolean(isManual));
}

export function refreshTrends(isManual = true) {
    loadTrends(Boolean(isManual));
}

export function switchYoutubeCategory(ytCategory) {
    if (!Object.hasOwn(YT_CATEGORIES, ytCategory)) return;
    currentYtCategory = ytCategory;

    document.querySelectorAll?.('#yt-tabs .news-tab-btn').forEach(btn => {
        const isTarget = btn.dataset.ytCat === ytCategory;
        btn.classList.toggle('active', isTarget);
        btn.setAttribute('aria-selected', String(isTarget));
        btn.tabIndex = isTarget ? 0 : -1;
    });

    loadYoutube(ytCategory, false);
}

export function refreshYoutube(isManual = true) {
    loadYoutube(currentYtCategory, Boolean(isManual));
}

function bindTabKeyboardNavigation(selector, dataKey, switchFn) {
    const tabs = [...(document.querySelectorAll?.(selector) || [])];
    tabs.forEach((tab, index) => {
        tab.addEventListener?.('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            switchFn(tabs[next].dataset[dataKey]);
            tabs[next]?.focus?.();
        });
    });
}

export function initNews() {
    bindTabKeyboardNavigation('#news-tabs .news-tab-btn', 'newsCat', switchNewsCategory);
    bindTabKeyboardNavigation('#yt-tabs .news-tab-btn', 'ytCat', switchYoutubeCategory);

    // 別タブでキャッシュが更新されたら即座に画面へ反映（API通信なし）
    if (typeof window !== 'undefined') {
        window.addEventListener?.('storage', event => {
            if (event.key === NEWS_CACHE_KEY) {
                const cached = getBucketCache(NEWS_CACHE_KEY, currentCategory);
                if (cached) {
                    renderNewsItems(cached.items);
                    updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (同期)`);
                }
            } else if (event.key === TRENDS_CACHE_KEY) {
                const cached = getBucketCache(TRENDS_CACHE_KEY, 'jp');
                if (cached) {
                    renderTrendItems(cached.items);
                    updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (同期)`);
                }
            } else if (event.key === YT_CACHE_KEY) {
                const cached = getBucketCache(YT_CACHE_KEY, currentYtCategory);
                if (cached) {
                    renderYoutubeItems(cached.items);
                    updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (同期)`);
                }
            }
        });
    }

    // 初回ロード時はプロキシへの同時バーストアクセスを避けるため段階的に実行（キャッシュヒット時は即時描画）
    loadNews('top', false);
    setTimeout(() => loadTrends(false), 250);
    setTimeout(() => loadYoutube('trending', false), 500);

    // 30分ごとに、タブがアクティブかつオンラインの時のみバックグラウンド更新チェック
    setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        loadNews(currentCategory, false);
        loadTrends(false);
        loadYoutube(currentYtCategory, false);
    }, NEWS_FRESH_TTL_MS);
}
