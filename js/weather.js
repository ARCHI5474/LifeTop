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
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m&timezone=auto`);
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
    
    if (!savedWeatherData) {
        alert("お天気データを読み込めませんでした。時間をおいて再度お試しください。");
        return;
    }
    
    const container = document.getElementById('weather-detail-content');
    if (!container) return;
    
    const current = savedWeatherData.current_weather;
    const hourly = savedWeatherData.hourly;
    
    const humidity = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[0] + "%" : "--";
    const wind = current.windspeed + " km/h";
    
    // 3時間おきの詳細データを作成
    let hourlyHtml = "";
    
    // 今後24時間の中から3時間おきに8点表示
    for (let i = 0; i < 24; i += 3) {
        if (!hourly.time[i]) break;
        const time = new Date(hourly.time[i]);
        const hour = time.getHours();
        const temp = Math.round(hourly.temperature_2m[i]);
        const hum = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : "--";
        const prec = hourly.precipitation_probability ? hourly.precipitation_probability[i] : "--";
        
        hourlyHtml += `
            <div class="weather-hourly-item">
                <span class="hourly-time">${hour}:00</span>
                <span class="hourly-temp">${temp}°C</span>
                <span class="hourly-prec">
                    <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">umbrella</span> ${prec}%
                </span>
                <span class="hourly-hum">
                    <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">water_drop</span> ${hum}%
                </span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="weather-detail-main">
            <span class="material-symbols-outlined" style="font-size: 52px; color: var(--p);">${parseWeatherCode(current.weathercode).icon}</span>
            <div class="detail-main-text">
                <h2>${parseWeatherCode(current.weathercode).text}</h2>
                <div class="detail-temp-row">
                    <span class="detail-temp">${Math.round(current.temperature)}°C</span>
                    <span class="detail-meta">湿度: ${humidity} | 風速: ${wind}</span>
                </div>
            </div>
        </div>
        <div class="weather-hourly-section">
            <h4>3時間ごとの予報</h4>
            <div class="weather-hourly-grid">
                ${hourlyHtml}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
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
