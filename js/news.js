/* LifeTop - External Feeds Engine (News, Realtime Trends, YouTube Recommendations)
   with 6-Layer Rate-Limit Protection, Cross-Tab Sync & Multi-Provider Fallback */

const NEWS_CACHE_KEY = 'lifetop_news_cache_v2';
const TRENDS_CACHE_KEY = 'lifetop_trends_cache_v1';
const YT_CACHE_KEY = 'lifetop_youtube_cache_v1';
const RATELIMIT_KEY = 'lifetop_feeds_ratelimit_v3';
const LOCK_KEY = 'lifetop_feeds_lock_v3';

// --- API制限対策 & 高速取得パラメータ ---
const NEWS_FRESH_TTL_MS = 30 * 60 * 1000;      // ニュース: 30分間は完全キャッシュ利用（API通信ゼロ）
const TRENDS_FRESH_TTL_MS = 30 * 60 * 1000;    // トレンドワード: 30分間は完全キャッシュ利用（API通信ゼロ）
const YT_FRESH_TTL_MS = 45 * 60 * 1000;        // YouTube動画: 45分間は完全キャッシュ利用（API通信ゼロ）
const MANUAL_COOLDOWN_MS = 3 * 60 * 1000;      // 手動更新ボタンの最短クールダウン（3分）
const FEATURE_MIN_INTERVAL_MS = 1000;          // 同一カテゴリ内の最小リクエスト間隔（1秒）
const MAX_REQUESTS_PER_HOUR = 80;              // 全フィード合算の1時間あたり最大外部リクエスト数上限
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;  // オフライン・制限時のキャッシュ保持上限（24時間）
const LOCK_LEASE_MS = 3500;                    // 複数タブ同時リクエスト防止ロック（3.5秒）
const FETCH_TIMEOUT_MS = 5500;                 // 1リクエストあたりのタイムアウト（5.5秒：海外プロキシのコールドキャッシュ許容）
const HEDGED_DELAY_MS = 320;                   // 第1候補が320ms以内に応答しない場合は即第2候補を並列起動

const MAX_NEWS_ITEMS = 6;
const MAX_TREND_ITEMS = 6;
const MAX_YT_ITEMS = 4;

// 海外プロキシからのジオブロックを受けないNHK・Googleニュースを最優先に配置し、Yahoo!ニュースを併用
export const NEWS_CATEGORIES = {
    top: {
        label: '主要',
        wikiQuery: 'ニュース OR 日本 OR 政治 OR 社会',
        feeds: [
            { url: 'https://www.nhk.or.jp/rss/news/cat0.xml', source: 'NHKニュース' },
            { url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', source: 'Google ニュース' },
            { url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml', source: 'Yahoo!ニュース' }
        ]
    },
    it: {
        label: 'IT・科学',
        wikiQuery: '人工知能 OR 半導体 OR 宇宙開発 OR 情報技術',
        feeds: [
            { url: 'https://www.nhk.or.jp/rss/news/cat3.xml', source: 'NHKニュース (科学・文化)' },
            { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ja&gl=JP&ceid=JP:ja', source: 'Google ニュース (IT)' },
            { url: 'https://news.yahoo.co.jp/rss/topics/it.xml', source: 'Yahoo!ニュース (IT)' }
        ]
    },
    business: {
        label: '経済',
        wikiQuery: '日本銀行 OR 日経平均株価 OR 経済 OR 為替',
        feeds: [
            { url: 'https://www.nhk.or.jp/rss/news/cat5.xml', source: 'NHKニュース (経済)' },
            { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ja&gl=JP&ceid=JP:ja', source: 'Google ニュース (経済)' },
            { url: 'https://news.yahoo.co.jp/rss/topics/business.xml', source: 'Yahoo!ニュース (経済)' }
        ]
    },
    world: {
        label: '国際・社会',
        wikiQuery: '国際連合 OR 外交 OR 国際情勢 OR 世界遺産',
        feeds: [
            { url: 'https://www.nhk.or.jp/rss/news/cat6.xml', source: 'NHKニュース (国際)' },
            { url: 'https://www.nhk.or.jp/rss/news/cat1.xml', source: 'NHKニュース (社会)' },
            { url: 'https://news.yahoo.co.jp/rss/topics/world.xml', source: 'Yahoo!ニュース (国際)' }
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

function canMakeExternalRequest(featureKey, hasCache = false) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { allowed: false, reason: 'オフライン' };
    }
    const state = getRateLimitState();
    const now = Date.now();
    if (hasCache) {
        const lastFeatureTs = state.lastByFeature[featureKey] || 0;
        if (now - lastFeatureTs < FEATURE_MIN_INTERVAL_MS) {
            return { allowed: false, reason: '連続アクセス防止中' };
        }
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
        const failures = Math.min(5, (current.failures || 0) + 1);
        const baseMs = retryAfterSec > 0 ? retryAfterSec * 1000 : 20 * 1000 * failures;
        const backoffMs = Math.min(15 * 60 * 1000, baseMs);
        state.providers[providerKey] = {
            failures,
            backoffUntil: Date.now() + backoffMs
        };
    }
    writeJsonStorage(RATELIMIT_KEY, state);
}

// --- クロスタブロック（複数タブ同時起動時の重複リクエスト防止 & リロード時デッドロック防止） ---
function acquireCrossTabLock(lockName, forceAcquire = false) {
    const locks = readJsonStorage(LOCK_KEY, {});
    const now = Date.now();
    const existing = locks[lockName];
    if (!forceAcquire && existing && existing.owner !== tabInstanceId && now - existing.timestamp < LOCK_LEASE_MS) {
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

function releaseAllOwnLocks() {
    const locks = readJsonStorage(LOCK_KEY, {});
    let changed = false;
    for (const key of Object.keys(locks)) {
        if (locks[key]?.owner === tabInstanceId) {
            delete locks[key];
            changed = true;
        }
    }
    if (changed) writeJsonStorage(LOCK_KEY, locks);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS, externalSignal = null) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener?.('abort', onExternalAbort, { once: true });
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener?.('abort', onExternalAbort);
    }
}

// --- Hedged Race（段階的並列レース：第1候補が速ければ1リクエストで完結、遅ければ即第2候補を並列起動し勝者確定時に残りをAbort） ---
async function runHedgedRace(taskBuilders, hedgeDelayMs = HEDGED_DELAY_MS) {
    const validBuilders = taskBuilders.filter(Boolean);
    if (!validBuilders.length) throw new Error('No tasks available');

    const sharedController = new AbortController();
    const timers = [];

    const wrappedPromises = validBuilders.map((builder, index) => new Promise((resolve, reject) => {
        const startTask = () => {
            if (sharedController.signal.aborted) {
                reject(new Error('Aborted'));
                return;
            }
            Promise.resolve()
                .then(() => builder(sharedController.signal))
                .then(resolve, reject);
        };

        if (index === 0 || hedgeDelayMs <= 0) {
            startTask();
        } else {
            const t = setTimeout(startTask, index * hedgeDelayMs);
            timers.push(t);
        }
    }));

    try {
        const winner = await Promise.any(wrappedPromises);
        sharedController.abort();
        return winner;
    } finally {
        timers.forEach(clearTimeout);
        sharedController.abort();
    }
}

// --- Base64 Data URL デコーダ（allorigins等が `data:application/rss+xml;base64,...` を返した場合に確実に対処） ---
function decodeProxyPayload(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('data:') && trimmed.includes(';base64,')) {
        try {
            const b64 = trimmed.slice(trimmed.indexOf(';base64,') + 8).trim();
            const binaryStr = atob(b64);
            const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch {
            return '';
        }
    }
    return trimmed;
}

// --- 汎用CORSプロキシ経由での高速XML取得（4系統フォールバック + Base64対応） ---
async function fetchXmlWithProxyFallback(targetUrl, externalSignal = null) {
    const proxyProviders = [
        {
            key: 'allorigins-get',
            run: async (sig) => {
                const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, {}, FETCH_TIMEOUT_MS, sig);
                if (res.status === 429) { markProviderResult('allorigins-get', false, 600); throw new Error('429'); }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const xml = decodeProxyPayload(data?.contents);
                if (!xml || xml.length < 40 || (!xml.includes('<item') && !xml.includes('<entry'))) {
                    throw new Error('Invalid XML in allorigins-get');
                }
                markProviderResult('allorigins-get', true);
                return { xml, provider: 'allorigins' };
            }
        },
        {
            key: 'codetabs',
            run: async (sig) => {
                const res = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, {}, FETCH_TIMEOUT_MS, sig);
                if (res.status === 429) { markProviderResult('codetabs', false, 600); throw new Error('429'); }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const xml = decodeProxyPayload(await res.text());
                if (!xml || xml.length < 40 || (!xml.includes('<item') && !xml.includes('<entry'))) {
                    throw new Error('Invalid XML in codetabs');
                }
                markProviderResult('codetabs', true);
                return { xml, provider: 'codetabs' };
            }
        },
        {
            key: 'corsproxy',
            run: async (sig) => {
                const res = await fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`, {}, FETCH_TIMEOUT_MS, sig);
                if (res.status === 429) { markProviderResult('corsproxy', false, 600); throw new Error('429'); }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const xml = decodeProxyPayload(await res.text());
                if (!xml || xml.length < 40 || (!xml.includes('<item') && !xml.includes('<entry'))) {
                    throw new Error('Invalid XML in corsproxy');
                }
                markProviderResult('corsproxy', true);
                return { xml, provider: 'corsproxy' };
            }
        },
        {
            key: 'allorigins-raw',
            run: async (sig) => {
                const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, {}, FETCH_TIMEOUT_MS, sig);
                if (res.status === 429) { markProviderResult('allorigins-raw', false, 600); throw new Error('429'); }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const xml = decodeProxyPayload(await res.text());
                if (!xml || xml.length < 40 || (!xml.includes('<item') && !xml.includes('<entry'))) {
                    throw new Error('Invalid XML in allorigins-raw');
                }
                markProviderResult('allorigins-raw', true);
                return { xml, provider: 'allorigins-raw' };
            }
        }
    ];

    const combineSignals = (sigA, sigB) => {
        if (!sigA) return sigB;
        if (!sigB) return sigA;
        const ctrl = new AbortController();
        const abort = () => ctrl.abort();
        if (sigA.aborted || sigB.aborted) { ctrl.abort(); return ctrl.signal; }
        sigA.addEventListener?.('abort', abort, { once: true });
        sigB.addEventListener?.('abort', abort, { once: true });
        return ctrl.signal;
    };

    const healthyTasks = proxyProviders
        .filter(p => isProviderHealthy(p.key))
        .map(p => (sig) => p.run(combineSignals(sig, externalSignal)));

    const tasksToRun = healthyTasks.length ? healthyTasks : proxyProviders.map(p => (sig) => p.run(combineSignals(sig, externalSignal)));
    return await runHedgedRace(tasksToRun, 280);
}

// ====================================================
// 1. Quickニュース取得ロジック（DOMParser + 正規表現フォールバック + 直接CORS保護）
// ====================================================
function stripCdataAndTags(raw) {
    if (!raw) return '';
    return String(raw)
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#x27;/g, "'")
        .trim();
}

function parseRssXmlFallbackRegex(xmlText, defaultSource) {
    const items = [];
    const blockRegex = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let match;
    while ((match = blockRegex.exec(xmlText)) !== null && items.length < MAX_NEWS_ITEMS) {
        const block = match[1];
        const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i) || block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
        const dateMatch = block.match(/<(?:pubDate|dc:date|published|updated)\b[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date|published|updated)>/i);
        const sourceMatch = block.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);

        const title = stripCdataAndTags(titleMatch?.[1] || '');
        const url = getSafeUrl(stripCdataAndTags(linkMatch?.[1] || ''));
        const pubDate = stripCdataAndTags(dateMatch?.[1] || '');
        const source = stripCdataAndTags(sourceMatch?.[1] || '') || defaultSource;
        if (title && url) {
            items.push({ title, url, pubDate, source });
        }
    }
    return items;
}

function parseRssXml(xmlText, defaultSource) {
    const cleaned = decodeProxyPayload(xmlText).replace(/^[\uFEFF\s]+/, '');
    if (!cleaned) return [];

    if (typeof DOMParser !== 'undefined') {
        try {
            const doc = new DOMParser().parseFromString(cleaned, 'text/xml');
            if (!doc.querySelector('parsererror')) {
                const channelTitle = doc.querySelector('channel > title, feed > title')?.textContent?.trim() || defaultSource;
                const itemNodes = [...doc.querySelectorAll('item, entry')];
                const parsed = itemNodes.map(node => {
                    const rawTitle = node.querySelector('title')?.textContent?.trim() || '';
                    const linkText = node.querySelector('link')?.textContent?.trim() || node.querySelector('link')?.getAttribute('href') || '';
                    const link = getSafeUrl(linkText);
                    const pubDate = node.querySelector('pubDate, dc\\:date, date, published, updated')?.textContent?.trim() || '';
                    const sourceNode = node.querySelector('source')?.textContent?.trim();
                    const source = sourceNode || channelTitle?.split(/[｜|-]/)[0]?.trim() || defaultSource;
                    const cleanTitle = sourceNode && rawTitle.endsWith(` - ${sourceNode}`)
                        ? rawTitle.slice(0, -(` - ${sourceNode}`).length).trim()
                        : rawTitle;
                    return { title: cleanTitle, url: link, pubDate, source };
                }).filter(item => item.title && item.url).slice(0, MAX_NEWS_ITEMS);
                if (parsed.length > 0) return parsed;
            }
        } catch {
            // 正規表現パーサーへフォールバック
        }
    }

    return parseRssXmlFallbackRegex(cleaned, defaultSource);
}

async function fetchViaRss2Json(feedUrl, defaultSource, externalSignal = null) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(apiUrl, {}, FETCH_TIMEOUT_MS, externalSignal);
    if (res.status === 429) {
        const retryAfter = Number(res.headers?.get?.('Retry-After')) || 600;
        markProviderResult('rss2json', false, retryAfter);
        throw new Error('Rate limited (429)');
    }
    // 個別フィードの422/500エラーではrss2json全体を停止させない（Yahoo等のジオブロック巻き添え防止）
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data?.status !== 'ok' || !Array.isArray(data.items) || !data.items.length) {
        throw new Error('Invalid rss2json payload');
    }
    markProviderResult('rss2json', true);
    return data;
}

async function fetchSingleNewsFeedFast(feed, externalSignal = null) {
    const candidates = [];
    if (isProviderHealthy('rss2json')) {
        candidates.push(async (sig) => {
            const data = await fetchViaRss2Json(feed.url, feed.source, sig || externalSignal);
            const items = data.items.map(item => ({
                title: String(item.title || '').trim(),
                url: getSafeUrl(item.link || item.url),
                pubDate: item.pubDate || '',
                source: data.feed?.title?.split(/[｜|-]/)[0]?.trim() || feed.source
            })).filter(item => item.title && item.url).slice(0, MAX_NEWS_ITEMS);
            if (!items.length) throw new Error('Empty rss2json items');
            return { items, provider: 'rss2json' };
        });
    }
    candidates.push(async (sig) => {
        const { xml, provider } = await fetchXmlWithProxyFallback(feed.url, sig || externalSignal);
        const items = parseRssXml(xml, feed.source);
        if (!items.length) throw new Error('Empty parsed XML items');
        return { items, provider };
    });

    return await runHedgedRace(candidates, 250);
}

// プロキシが全滅した環境向けの直接CORS対応（プロキシ不要 `origin=*`）ニューストピック取得
async function fetchDirectCorsNewsFallback(category) {
    const catConfig = NEWS_CATEGORIES[category] || NEWS_CATEGORIES.top;
    const query = catConfig.wikiQuery || '日本 ニュース';
    const url = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${MAX_NEWS_ITEMS}&utf8=1&format=json&origin=*`;
    const res = await fetchWithTimeout(url, {}, 3500);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data?.query?.search;
    if (!Array.isArray(list) || !list.length) throw new Error('Empty direct fallback');
    const items = list.slice(0, MAX_NEWS_ITEMS).map(entry => {
        const title = String(entry.title || '').trim();
        const snippet = stripCdataAndTags(entry.snippet || '');
        return {
            title: snippet ? `${title} — ${snippet.slice(0, 46)}…` : title,
            url: `https://news.google.com/search?q=${encodeURIComponent(title)}&hl=ja&gl=JP&ceid=JP%3Aja`,
            pubDate: entry.timestamp || '',
            source: `注目トピック (${catConfig.label})`
        };
    }).filter(item => item.title && item.url);
    if (!items.length) throw new Error('No valid fallback items');
    return { items, provider: 'direct-cors' };
}

async function fetchNewsCategoryFromNetwork(category) {
    const catConfig = NEWS_CATEGORIES[category] || NEWS_CATEGORIES.top;
    recordExternalRequest(`news:${category}`);

    try {
        const feedTasks = catConfig.feeds.map(feed => (sig) => fetchSingleNewsFeedFast(feed, sig));
        return await runHedgedRace(feedTasks, 350);
    } catch {
        // 万一すべての外部RSSプロキシが遮断・タイムアウトした場合でも直接CORS APIで確実に表示
        return await fetchDirectCorsNewsFallback(category);
    }
}

// ====================================================
// 2. リアルタイム話題のワード取得ロジック（直接CORS API最優先 + 並列レース）
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

// MediaWiki公式 MostViewed API（プロキシ不要・直接CORS `origin=*`・PC時計の年月に非依存・応答100〜250ms）
async function fetchWikimediaMostViewedDirect(externalSignal = null) {
    const url = 'https://ja.wikipedia.org/w/api.php?action=query&list=mostviewed&pvimlimit=18&format=json&origin=*';
    const res = await fetchWithTimeout(url, {}, 2400, externalSignal);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = data?.query?.mostviewed;
    if (!Array.isArray(list)) throw new Error('Invalid mostviewed response');

    const filtered = list
        .filter(item => item && item.ns === 0 && item.title && !/^(メインページ|特別:|Wikipedia:|Portal:|ファイル:|一覧)/.test(item.title))
        .slice(0, MAX_TREND_ITEMS)
        .map(item => {
            const keyword = String(item.title).trim();
            const count = typeof item.count === 'number' ? `${item.count.toLocaleString('ja-JP')} 注目` : '急上昇ワード';
            return {
                keyword,
                badge: count,
                context: 'いま検索・閲覧が急増している注目ワード',
                url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
            };
        });

    if (filtered.length < 4) throw new Error('Insufficient mostviewed items');
    markProviderResult('wikimedia', true);
    return { items: filtered, provider: 'wikimedia-direct' };
}

async function fetchGoogleTrendsRssFast(externalSignal = null) {
    const rssUrl = 'https://trends.google.co.jp/trending/rss?geo=JP';
    const { xml, provider } = await fetchXmlWithProxyFallback(rssUrl, externalSignal);
    const items = parseGoogleTrendsXml(xml);
    if (items.length < 3) throw new Error('Insufficient Google Trends items');
    return { items, provider };
}

async function fetchTrendsFromNetwork() {
    recordExternalRequest('trends');
    // 直接CORS対応で超高速（〜200ms）なWikimedia公式APIとGoogle Trends RSSを並列レース
    return await runHedgedRace([
        (sig) => fetchWikimediaMostViewedDirect(sig),
        (sig) => fetchGoogleTrendsRssFast(sig)
    ], 150);
}

// ====================================================
// 3. YouTubeおすすめ動画取得ロジック（並列チャンネル取得 & 高速タイムアウト）
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

async function fetchChannelVideos(channel) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.id)}`;
    const candidates = [];

    if (isProviderHealthy('rss2json')) {
        candidates.push(async (sig) => {
            const data = await fetchViaRss2Json(feedUrl, channel.name, sig);
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
            if (!items.length) throw new Error('Empty rss2json channel videos');
            return { items, provider: 'rss2json' };
        });
    }

    candidates.push(async (sig) => {
        const { xml, provider } = await fetchXmlWithProxyFallback(feedUrl, sig);
        const items = parseYoutubeAtomXml(xml, channel.name);
        if (!items.length) throw new Error('Empty channel videos');
        return { items, provider };
    });

    return await runHedgedRace(candidates, 400);
}

async function fetchYoutubeCategoryFromNetwork(ytCategory) {
    const config = YT_CATEGORIES[ytCategory] || YT_CATEGORIES.trending;
    recordExternalRequest(`yt:${ytCategory}`);

    // 複数チャンネルを直列で待たず並列に取得し、最初に応答したチャンネル群から即座に構築
    const targetChannels = config.channels.slice(0, 2);
    const results = await Promise.allSettled(targetChannels.map(ch => fetchChannelVideos(ch)));

    const collected = [];
    const seenIds = new Set();
    let usedProvider = 'youtube-rss';

    for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.items?.length) {
            usedProvider = res.value.provider || usedProvider;
            for (const video of res.value.items.slice(0, 3)) {
                if (!seenIds.has(video.videoId)) {
                    seenIds.add(video.videoId);
                    collected.push(video);
                }
            }
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

    const reqKey = `news:${category}`;
    const rateCheck = canMakeExternalRequest(reqKey, Boolean(cached));
    if (!rateCheck.allowed) {
        if (cached) updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (${rateCheck.reason})`);
        else { renderNewsItems([]); updateFeedStatusUI('news-status-text', 'news-refresh-btn', rateCheck.reason); }
        return;
    }

    if (inFlightRequests.has(reqKey)) {
        updateFeedStatusUI('news-status-text', 'news-refresh-btn', '更新中...', true);
        await inFlightRequests.get(reqKey);
        return;
    }

    // キャッシュが既に存在する時のみ他タブのロックを尊重し、未キャッシュ時はデッドロックを防いで即取得
    if (!acquireCrossTabLock(reqKey, !cached)) {
        if (cached) {
            updateFeedStatusUI('news-status-text', 'news-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
            return;
        }
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

    const rateCheck = canMakeExternalRequest('trends:jp', Boolean(cached));
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

    if (!acquireCrossTabLock(reqKey, !cached)) {
        if (cached) {
            updateFeedStatusUI('trends-status-text', 'trends-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
            return;
        }
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

    const reqKey = `yt:${ytCategory}`;
    const rateCheck = canMakeExternalRequest(reqKey, Boolean(cached));
    if (!rateCheck.allowed) {
        if (cached) updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得 (${rateCheck.reason})`);
        else { renderYoutubeItems([]); updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', rateCheck.reason); }
        return;
    }

    if (inFlightRequests.has(reqKey)) {
        updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', '更新中...', true);
        await inFlightRequests.get(reqKey);
        return;
    }

    if (!acquireCrossTabLock(reqKey, !cached)) {
        if (cached) {
            updateFeedStatusUI('yt-status-text', 'yt-refresh-btn', `${formatClockTime(cached.timestamp)} 取得`);
            return;
        }
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
        window.addEventListener?.('pagehide', releaseAllOwnLocks);
        window.addEventListener?.('beforeunload', releaseAllOwnLocks);
    }

    // 初回ロード時は3フィードを並列で即時開始（キャッシュヒット時は0ms描画、通信時も並列レースで高速完了）
    loadNews('top', false);
    loadTrends(false);
    loadYoutube('trending', false);

    // 30分ごとに、タブがアクティブかつオンラインの時のみバックグラウンド更新チェック
    setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        loadNews(currentCategory, false);
        loadTrends(false);
        loadYoutube(currentYtCategory, false);
    }, NEWS_FRESH_TTL_MS);
}
