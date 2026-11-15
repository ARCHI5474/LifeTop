export const SCENES = ['aurora', 'ripple'];
export function activePresence(rows, members, now = Date.now()) {
    return rows.filter(row => members.includes(row.id) && Number.isFinite(row.expiresAtMs) && row.expiresAtMs > now && row.updatedAtMs <= now + 10000).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 20);
}
export function newRipples(rows, seen, now = Date.now()) {
    const fresh = [];
    for (const row of rows) {
        const r = row.ripple;
        if (!r || seen.has(r.id) || !Number.isFinite(r.at) || r.at > now + 10000 || now - r.at > 8000 || !Number.isFinite(r.x) || !Number.isFinite(r.y) || r.x < 0 || r.x > 1 || r.y < 0 || r.y > 1) continue;
        seen.add(r.id); fresh.push({...r, sender: row.id});
    }
    if (seen.size > 200) for (const key of [...seen].slice(0, seen.size - 100)) seen.delete(key);
    return fresh;
}
export function skyState(weather, now = Date.now()) {
    const seconds = now / 1000;
    const offset = Number.isFinite(weather?.utc_offset_seconds) ? weather.utc_offset_seconds : -new Date(now).getTimezoneOffset() * 60;
    const hour = ((seconds + offset) % 86400 + 86400) % 86400 / 3600;
    const sunrise = weather?.daily?.sunrise?.find(value => Math.abs(value - seconds) < 86400);
    const index = weather?.daily?.sunrise?.indexOf(sunrise);
    const sunset = weather?.daily?.sunset?.[index];
    const daylight = Number.isFinite(sunrise) && Number.isFinite(sunset)
        ? Math.max(0, Math.min(1, Math.min((seconds - sunrise) / 2400 + .5, (sunset - seconds) / 2400 + .5)))
        : Math.max(0, Math.min(1, Math.min(hour - 5.5, 18.5 - hour)));
    const code = weather?.current_weather?.weathercode ?? -1;
    return {hour, daylight, rain: code >= 51 && code <= 99, snow: code >= 71 && code <= 77 || code === 85 || code === 86, clouds: code >= 1 && code <= 3 || code === 45 || code === 48, wind: Math.min(60, Math.max(0, weather?.current_weather?.windspeed || 0))};
}
export function frequencyBands(bytes, sampleRate, fftSize) {
    const band = (lo, hi) => {
        const start = Math.max(0, Math.floor(lo * fftSize / sampleRate));
        const end = Math.min(bytes.length, Math.ceil(hi * fftSize / sampleRate));
        let sum = 0; for (let i = start; i < end; i++) sum += bytes[i];
        return end > start ? sum / (end - start) / 255 : 0;
    };
    return [band(30, 250), band(250, 2000), band(2000, 12000)];
}
