/* LifeTop - weather widget and extended detailed modal (with instant cache & non-blocking geolocation) */

const WEATHER_CACHE_KEY = 'lifetop_weather_cache_v1';
const WEATHER_COORDS_KEY = 'lifetop_weather_coords_v1';
const WEATHER_FRESH_TTL_MS = 30 * 60 * 1000;      // 30分間はキャッシュを即時表示（通信ゼロ）
const WEATHER_STALE_MAX_MS = 24 * 60 * 60 * 1000; // 最大24時間はStale-While-Revalidateとして即時表示
const WEATHER_TIMEOUT_MS = 3500;                  // 通信タイムアウト（3.5秒）
const DEFAULT_COORDS = { lat: 35.6785, lon: 139.6823 }; // 東京

let savedWeatherData = null;
let weatherTrigger = null;
let latestRequest = 0;

export function weatherNumber(value, unit = '') {
    return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${unit}` : '--';
}

export function forecastIndex(times, currentTime) {
    // API timestamps share the location's timezone and can be compared directly.
    // Parsing them as browser-local dates shifts the forecast for remote locations.
    const index = times.findIndex(time => time >= currentTime);
    return index < 0 ? Math.max(0, times.length - 1) : index;
}

function readWeatherCache() {
    try {
        const raw = localStorage.getItem(WEATHER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.data?.current_weather || typeof parsed.timestamp !== 'number') return null;
        if (Date.now() - parsed.timestamp > WEATHER_STALE_MAX_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeWeatherCache(data, lat, lon) {
    try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
            data,
            lat,
            lon,
            timestamp: Date.now()
        }));
    } catch {
        // ignore storage quota errors
    }
}

function readSavedCoords() {
    try {
        const raw = localStorage.getItem(WEATHER_COORDS_KEY);
        if (!raw) return DEFAULT_COORDS;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number') {
            return { lat: parsed.lat, lon: parsed.lon };
        }
    } catch {
        // ignore
    }
    return DEFAULT_COORDS;
}

function writeSavedCoords(lat, lon) {
    try {
        localStorage.setItem(WEATHER_COORDS_KEY, JSON.stringify({ lat, lon }));
    } catch {
        // ignore
    }
}

function applyWeatherWidgetUI(data) {
    if (!data?.current_weather) return;
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');
    const temp = weatherNumber(data.current_weather.temperature);
    const wInfo = parseWeatherCode(data.current_weather.weathercode);
    if (tempEl) tempEl.innerText = `${temp}°C`;
    if (descEl) descEl.innerText = wInfo.text;
    if (iconEl) iconEl.innerText = wInfo.icon;
}

// 天気ウィジェット (キャッシュ即時表示 + 非ブロッキング位置情報取得)
export async function fetchWeather() {
    const cached = readWeatherCache();
    if (cached) {
        savedWeatherData = cached.data;
        applyWeatherWidgetUI(cached.data);
        if (Date.now() - cached.timestamp < WEATHER_FRESH_TTL_MS) {
            return;
        }
    }

    // 位置情報の応答（最大数秒）を待たず、前回座標または東京の天気を即座に取得開始
    const initialCoords = readSavedCoords();
    const initialFetchPromise = getWeatherData(initialCoords.lat, initialCoords.lon);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                writeSavedCoords(lat, lon);
                const moved = Math.abs(lat - initialCoords.lat) > 0.03 || Math.abs(lon - initialCoords.lon) > 0.03;
                if (moved) {
                    getWeatherData(lat, lon);
                }
            },
            () => {
                // 位置情報拒否・タイムアウト時は既にinitialCoordsで取得済みのため待機不要
            },
            { timeout: 2500, maximumAge: 3600000, enableHighAccuracy: false }
        );
    }

    await initialFetchPromise;
}

export async function getWeatherData(lat, lon) {
    const request = ++latestRequest;
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS) : null;

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode,wind_speed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
        const data = await res.json();
        if (request !== latestRequest) return;

        if (data && data.current_weather) {
            savedWeatherData = data;
            writeWeatherCache(data, lat, lon);
            applyWeatherWidgetUI(data);
            if (document.getElementById('weather-detail-modal')?.classList.contains('active')) showWeatherDetail(true);
        } else {
            throw new Error("Invalid weather response");
        }
    } catch {
        if (request !== latestRequest) return;
        if (!savedWeatherData) {
            if (tempEl) tempEl.innerText = "--°C";
            if (descEl) descEl.innerText = "エラー";
            if (iconEl) iconEl.innerText = "cloud_off";
            const empty = document.querySelector('#weather-detail-content .weather-empty-state');
            if (empty) {
                empty.querySelector('p').textContent = '天気を取得できませんでした。通信環境を確認して、もう一度お試しください。';
                if (!empty.querySelector('button')) {
                    const retry = document.createElement('button');
                    retry.type = 'button';
                    retry.className = 'tonal-btn';
                    retry.textContent = '再読み込み';
                    retry.onclick = () => { retry.remove(); fetchWeather(); };
                    empty.append(retry);
                }
            }
        }
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// 詳細モーダル表示
export function showWeatherDetail(refresh = false) {
    const modal = document.getElementById('weather-detail-modal');
    if (!modal) return;

    if (!modal.dataset.listenerAttached) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeWeatherDetail();
        });
        modal.dataset.listenerAttached = 'true';
    }
    
    const container = document.getElementById('weather-detail-content');
    if (!container) return;

    if (!modal.classList.contains('active')) {
        weatherTrigger = document.activeElement;
    }

    if (!savedWeatherData) {
        container.innerHTML = `
            <div class="weather-empty-state">
                <span class="material-symbols-outlined" aria-hidden="true">cloud_sync</span>
                <p>お天気データを取得しています。少し待ってから再度お試しください。</p>
                <button type="button" class="primary-btn" onclick="closeWeatherDetail()">閉じる</button>
            </div>
        `;
        modal.inert = false;
        modal.classList.add('active');
        if (document.body?.style) document.body.style.overflow = 'hidden';
        modal.querySelector('.weather-modal-close')?.focus({ preventScroll: true });
        fetchWeather();
        return;
    }
    
    const current = savedWeatherData.current_weather;
    const hourly = savedWeatherData.hourly;
    const daily = savedWeatherData.daily || {};
    if (!current || !hourly || !Array.isArray(hourly.time)) {
        container.innerHTML = `
            <div class="weather-empty-state">
                <span class="material-symbols-outlined" aria-hidden="true">cloud_off</span>
                <p>お天気データの形式が正しくありません。時間をおいて再度お試しください。</p>
            </div>
        `;
        modal.inert = false;
        modal.classList.add('active');
        if (document.body?.style) document.body.style.overflow = 'hidden';
        modal.querySelector('.weather-modal-close')?.focus({ preventScroll: true });
        return;
    }

    const currentIndex = forecastIndex(hourly.time, current.time);
    const observationIndex = Math.max(0, currentIndex - (hourly.time[currentIndex] > current.time ? 1 : 0));

    const humidity = Array.isArray(hourly.relative_humidity_2m)
        ? `${weatherNumber(hourly.relative_humidity_2m[observationIndex])}%`
        : "--";
    const apparentTemp = weatherNumber(hourly.apparent_temperature?.[observationIndex] ?? current.temperature, '°C');
    const wind = weatherNumber(current.windspeed, ' km/h');

    const maxTemp = Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max[0] != null
        ? `${Math.round(daily.temperature_2m_max[0])}°C`
        : "--";
    const minTemp = Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min[0] != null
        ? `${Math.round(daily.temperature_2m_min[0])}°C`
        : "--";
    const uvMax = Array.isArray(daily.uv_index_max) && daily.uv_index_max[0] != null
        ? Math.round(daily.uv_index_max[0])
        : "--";
    const sunrise = formatTimeStr(daily.sunrise?.[0]);
    const sunset = formatTimeStr(daily.sunset?.[0]);
    const uvLevel = getUvLevel(uvMax);

    // 3時間おきの詳細データを作成
    let hourlyHtml = "";
    const todayDate = String(current.time).slice(0, 10);
    
    // 今後24時間の中から3時間おきに8点表示
    for (let i = currentIndex; i < Math.min(currentIndex + 24, hourly.time.length); i += 3) {
        if (!hourly.time[i]) break;
        const hour = Number(hourly.time[i].slice(11, 13));
        const timeDate = hourly.time[i].slice(0, 10);
        const dayLabel = (timeDate !== todayDate) ? "明日 " : "";
        const temp = weatherNumber(hourly.temperature_2m?.[i]);
        const hum = weatherNumber(hourly.relative_humidity_2m?.[i]);
        const prec = weatherNumber(hourly.precipitation_probability?.[i]);
        const code = hourly.weathercode ? hourly.weathercode[i] : current.weathercode;
        const wInfo = parseWeatherCode(code);
        
        hourlyHtml += `
            <div class="weather-hourly-item">
                <span class="hourly-time">${dayLabel}${hour}:00</span>
                <div class="hourly-weather">
                    <span class="material-symbols-outlined">${wInfo.icon}</span>
                    <span class="hourly-weather-text">${wInfo.text}</span>
                </div>
                <span class="hourly-temp">${temp}°C</span>
                <span class="hourly-prec" title="降水確率"><span class="hourly-data-label">降水</span>
                    <span class="material-symbols-outlined" style="font-size: 14px;">umbrella</span> ${prec}%
                </span>
                <span class="hourly-hum" title="湿度"><span class="hourly-data-label">湿度</span>
                    <span class="material-symbols-outlined" style="font-size: 14px;">water_drop</span> ${hum}%
                </span>
            </div>
        `;
    }

    const currentWeatherInfo = parseWeatherCode(current.weathercode);
    
    container.innerHTML = `
        <p class="weather-data-time">観測 ${String(current.time || '').replace('T', ' ')} · 現地時刻 / ${savedWeatherData.timezone || '現地時間'}</p>
        <div class="weather-detail-main">
            <div class="weather-detail-icon-wrap">
                <span class="material-symbols-outlined">${currentWeatherInfo.icon}</span>
            </div>
            <div class="detail-main-text">
                <h2>${currentWeatherInfo.text}</h2>
                <div class="detail-temp-row">
                    <span class="detail-temp">${weatherNumber(current.temperature)}°C</span>
                    <div class="detail-high-low">
                        <span>最高 ${maxTemp}</span>
                        <span>最低 ${minTemp}</span>
                    </div>
                </div>
                <div class="detail-apparent">体感温度: ${apparentTemp}</div>
            </div>
        </div>

        <div class="weather-metrics-grid">
            <div class="weather-metric-card">
                <div class="metric-icon">
                    <span class="material-symbols-outlined">water_drop</span>
                </div>
                <div class="metric-info">
                    <span class="metric-label">湿度</span>
                    <span class="metric-value">${humidity}</span>
                </div>
            </div>
            <div class="weather-metric-card">
                <div class="metric-icon">
                    <span class="material-symbols-outlined">air</span>
                </div>
                <div class="metric-info">
                    <span class="metric-label">風速</span>
                    <span class="metric-value">${wind}</span>
                </div>
            </div>
            <div class="weather-metric-card">
                <div class="metric-icon">
                    <span class="material-symbols-outlined">sunny</span>
                </div>
                <div class="metric-info">
                    <span class="metric-label">UV指数</span>
                    <span class="metric-value">${uvMax} <span class="metric-sub">${uvLevel}</span></span>
                </div>
            </div>
            <div class="weather-metric-card">
                <div class="metric-icon">
                    <span class="material-symbols-outlined">wb_twilight</span>
                </div>
                <div class="metric-info">
                    <span class="metric-label">日の出 / 日の入り</span>
                    <span class="metric-value">${sunrise} / ${sunset}</span>
                </div>
            </div>
        </div>

        <div class="weather-hourly-section">
            <h4><span class="material-symbols-outlined">schedule</span> 3時間ごとの予報</h4>
            <div class="weather-hourly-grid">
                ${hourlyHtml}
            </div>
        </div>
    `;
    
    modal.inert = false;
    modal.classList.add('active');
    if (document.body?.style) document.body.style.overflow = 'hidden';
    if (!refresh) modal.querySelector('.weather-modal-close')?.focus({ preventScroll: true });
}

function formatTimeStr(isoStr) {
    return typeof isoStr === 'string' && /T\d{2}:\d{2}/.test(isoStr) ? isoStr.slice(11, 16) : '--:--';
}

function getUvLevel(uv) {
    if (uv == null || uv === "--" || isNaN(uv)) return "";
    if (uv < 3) return "弱";
    if (uv < 6) return "中";
    if (uv < 8) return "強";
    return "極強";
}

export function closeWeatherDetail() {
    const modal = document.getElementById('weather-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.inert = true;
        if (document.body?.style) document.body.style.overflow = '';
        if (weatherTrigger?.isConnected) weatherTrigger.focus({ preventScroll: true });
        weatherTrigger = null;
    }
}

export function parseWeatherCode(code) {
    const mapping = {
        0: { text: "快晴", icon: "wb_sunny" },
        1: { text: "晴れ", icon: "wb_sunny" },
        2: { text: "一部曇", icon: "filter_drama" },
        3: { text: "曇り", icon: "cloud" },
        45: { text: "霧", icon: "foggy" },
        48: { text: "霧", icon: "foggy" },
        51: { text: "弱い霧雨", icon: "rainy" },
        53: { text: "霧雨", icon: "rainy" },
        55: { text: "強い霧雨", icon: "rainy" },
        61: { text: "小雨", icon: "rainy" },
        63: { text: "雨", icon: "rainy" },
        65: { text: "大雨", icon: "rainy" },
        71: { text: "小雪", icon: "ac_unit" },
        73: { text: "雪", icon: "ac_unit" },
        75: { text: "大雪", icon: "ac_unit" },
        77: { text: "細かい雪", icon: "ac_unit" },
        80: { text: "にわか雨", icon: "rainy_light" },
        81: { text: "にわか雨", icon: "rainy" },
        82: { text: "激しいにわか雨", icon: "rainy" },
        85: { text: "にわか雪", icon: "ac_unit" },
        86: { text: "激しいにわか雪", icon: "ac_unit" },
        95: { text: "雷雨", icon: "thunderstorm" },
        96: { text: "ひょうを伴う雷雨", icon: "thunderstorm" },
        99: { text: "激しい雷雨", icon: "thunderstorm" }
    };
    
    return mapping[code] || { text: "不明", icon: "filter_drama" };
}
