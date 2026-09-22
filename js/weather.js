/* LifeTop - weather widget and extended detailed modal */

let savedWeatherData = null;

// 天気ウィジェット (位置情報 or デフォルト東京)
export async function fetchWeather() {
    let lat = 35.6785;
    let lon = 139.6823;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                lat = position.coords.latitude;
                lon = position.coords.longitude;
                getWeatherData(lat, lon);
            },
            (error) => {
                console.log("位置情報の取得失敗。東京の天気を表示します。");
                getWeatherData(lat, lon);
            },
            { timeout: 5000 }
        );
    } else {
        getWeatherData(lat, lon);
    }
}

export async function getWeatherData(lat, lon) {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');
    
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode,wind_speed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
        const data = await res.json();
        
        if (data && data.current_weather) {
            savedWeatherData = data; // キャッシュに保存
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            
            tempEl.innerText = `${temp}°C`;
            const wInfo = parseWeatherCode(code);
            descEl.innerText = wInfo.text;
            iconEl.innerText = wInfo.icon;
        } else {
            throw new Error("Invalid weather response");
        }
    } catch (e) {
        tempEl.innerText = "--°C";
        descEl.innerText = "エラー";
        iconEl.innerText = "cloud_off";
        savedWeatherData = null;
    }
}

// 詳細モーダル表示
export function showWeatherDetail() {
    const modal = document.getElementById('weather-detail-modal');
    if (!modal) return;

    if (!modal.dataset.listenerAttached) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeWeatherDetail();
        });
        modal.dataset.listenerAttached = 'true';
    }
    
    if (!savedWeatherData) {
        alert("お天気データを読み込めませんでした。時間をおいて再度お試しください。");
        return;
    }
    
    const container = document.getElementById('weather-detail-content');
    if (!container) return;
    
    const current = savedWeatherData.current_weather;
    const hourly = savedWeatherData.hourly;
    const daily = savedWeatherData.daily || {};
    if (!current || !hourly || !Array.isArray(hourly.time)) {
        alert("お天気データの形式が正しくありません。再読み込みしてください。");
        return;
    }

    let currentIndex = hourly.time.indexOf(current.time);
    if (currentIndex === -1) {
        const nowMs = Date.now();
        let closestDiff = Infinity;
        hourly.time.forEach((t, idx) => {
            const diff = Math.abs(new Date(t).getTime() - nowMs);
            if (diff < closestDiff) {
                closestDiff = diff;
                currentIndex = idx;
            }
        });
        if (currentIndex === -1) currentIndex = 0;
    }

    const humidity = Array.isArray(hourly.relative_humidity_2m)
        ? `${hourly.relative_humidity_2m[currentIndex] ?? '--'}%`
        : "--";
    const apparentTemp = Array.isArray(hourly.apparent_temperature) && hourly.apparent_temperature[currentIndex] != null
        ? `${Math.round(hourly.apparent_temperature[currentIndex])}°C`
        : `${Math.round(current.temperature)}°C`;
    const wind = `${Math.round(current.windspeed)} km/h`;

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
    const todayDate = new Date().getDate();
    
    // 今後24時間の中から3時間おきに8点表示
    for (let i = currentIndex; i < Math.min(currentIndex + 24, hourly.time.length); i += 3) {
        if (!hourly.time[i]) break;
        const time = new Date(hourly.time[i]);
        const hour = time.getHours();
        const timeDate = time.getDate();
        const dayLabel = (timeDate !== todayDate) ? "明日 " : "";
        const temp = Math.round(hourly.temperature_2m[i]);
        const hum = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : "--";
        const prec = hourly.precipitation_probability ? hourly.precipitation_probability[i] : "--";
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
                <span class="hourly-prec" title="降水確率">
                    <span class="material-symbols-outlined" style="font-size: 14px;">umbrella</span> ${prec}%
                </span>
                <span class="hourly-hum" title="湿度">
                    <span class="material-symbols-outlined" style="font-size: 14px;">water_drop</span> ${hum}%
                </span>
            </div>
        `;
    }

    const currentWeatherInfo = parseWeatherCode(current.weathercode);
    
    container.innerHTML = `
        <div class="weather-detail-main">
            <div class="weather-detail-icon-wrap">
                <span class="material-symbols-outlined">${currentWeatherInfo.icon}</span>
            </div>
            <div class="detail-main-text">
                <h2>${currentWeatherInfo.text}</h2>
                <div class="detail-temp-row">
                    <span class="detail-temp">${Math.round(current.temperature)}°C</span>
                    <div class="detail-high-low">
                        <span>↑ ${maxTemp}</span>
                        <span>↓ ${minTemp}</span>
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
    
    modal.classList.add('active');
}

function formatTimeStr(isoStr) {
    if (!isoStr) return "--:--";
    try {
        const d = new Date(isoStr);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
        return "--:--";
    }
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
