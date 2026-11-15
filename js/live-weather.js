const CACHE_KEY = 'lifetop_live_weather_v1', LOCATION_KEY = 'lifetop_live_location_v1';
const cities = {
    tokyo: {lat: 35.68, lon: 139.68, name: '東京'},
    london: {lat: 51.51, lon: -.13, name: 'ロンドン'},
    newyork: {lat: 40.71, lon: -74.01, name: 'ニューヨーク'}
};
export function createLiveWeather(onUpdate, onStatus) {
    let location = cities.tokyo, controller, generation = 0, timer;
    try { const saved = JSON.parse(localStorage.getItem(LOCATION_KEY)); if (Number.isFinite(saved?.lat) && Number.isFinite(saved?.lon) && Math.abs(saved.lat) <= 90 && Math.abs(saved.lon) <= 180) location = saved; } catch {}
    let data;
    function present(value, cached = false) {
        data = value; onUpdate(value);
        const code = value.current_weather.weathercode;
        const sky = code === 0 ? '晴れ' : code <= 3 ? '曇り' : code <= 48 ? '霧' : code >= 71 && code <= 77 || code === 85 || code === 86 ? '雪' : '雨';
        onStatus(`${location.name} · ${Math.round(value.current_weather.temperature)}° · ${sky}${cached ? ' · 保存済みの天気' : ''}`);
    }
    async function refresh(force = false) {
        const attempt = ++generation;
        controller?.abort();
        let cache;
        try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch {}
        if (cache?.lat === location.lat && cache?.lon === location.lon && Date.now() - cache.at < 86400000 && cache.data?.current_weather) {
            present(cache.data, true); if (!force && Date.now() - cache.at < 1800000) return;
        }
        controller = new AbortController(); const abort = setTimeout(() => controller.abort(), 6000);
        try {
            const query = new URLSearchParams({latitude: location.lat, longitude: location.lon, current_weather: 'true', daily: 'sunrise,sunset', timezone: 'auto', timeformat: 'unixtime', forecast_days: '2'});
            const response = await fetch('https://api.open-meteo.com/v1/forecast?' + query, {signal: controller.signal});
            if (!response.ok) throw Error('weather');
            const value = await response.json();
            if (attempt !== generation) return;
            if (!Number.isFinite(value?.current_weather?.temperature) || !Number.isFinite(value?.current_weather?.weathercode)) throw Error('weather');
            present(value);
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({lat: location.lat, lon: location.lon, at: Date.now(), data: value})); } catch {}
        } catch {
            if (attempt === generation) {
                if (cache?.lat === location.lat && cache?.lon === location.lon && Date.now() - cache.at < 86400000 && cache.data?.current_weather) present(cache.data, true);
                else { data = undefined; onUpdate(undefined); onStatus(`${location.name} · 天気を取得できません。端末の時刻で描画中`); }
            }
        } finally { clearTimeout(abort); }
    }
    async function select(value) {
        if (value === 'current') {
            if (!navigator.geolocation) { onStatus('位置情報はこのブラウザで利用できません。'); return; }
            onStatus('位置情報の許可を待っています…');
            const attempt = ++generation;
            try {
                const p = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 10000, maximumAge: 300000}));
                if (attempt !== generation) return;
                location = {lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, name: '現在地'};
            } catch { if (attempt === generation) onStatus('位置情報を取得できませんでした。都市を選択できます。'); return; }
        } else if (cities[value]) { generation++; location = cities[value]; }
        else return;
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(location)); } catch {}
        await refresh(true);
    }
    timer = setInterval(() => { if (!document.hidden) void refresh(); }, 1800000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return {refresh, select, getData: () => data, getLocation: () => Object.keys(cities).find(key => cities[key].lat === location.lat && cities[key].lon === location.lon) || 'current', destroy() { generation++; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); }};
}
