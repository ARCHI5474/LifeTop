import {skyState} from './live-model.js?v=13.0.1';

export function createLiveScene(canvas, {home = false, reduced = () => false} = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return {setWeather(){}, setScene(){}, setBands(){}, setPeople(){}, ripple(){}, destroy(){}};
    let width = 1, height = 1, frame = 0, last = 0, elapsed = 0, weather, scene = 'aurora', people = [], bands = [0, 0, 0], ripples = [], alive = true;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new ResizeObserver(() => { resize(); draw(performance.now()); });
    function resize() {
        const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
        width = Math.max(1, rect.width); height = Math.max(1, rect.height);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(time) {
        const still = media.matches || reduced();
        const t = still ? 0 : elapsed;
        const sky = skyState(weather), d = sky.daylight;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgb(${8 + d * 44},${16 + d * 67},${34 + d * 77})`);
        gradient.addColorStop(.65, `rgb(${17 + d * 105},${40 + d * 93},${54 + d * 87})`);
        gradient.addColorStop(1, `rgb(${8 + d * 48},${26 + d * 53},${39 + d * 65})`);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
        const sunX = width * (.14 + .72 * Math.max(0, Math.min(1, (sky.hour - 6) / 12)));
        const sunY = height * (.48 - .26 * Math.sin(Math.PI * Math.max(0, Math.min(1, (sky.hour - 6) / 12))));
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * .4);
        glow.addColorStop(0, `rgba(255,211,160,${d * .22})`); glow.addColorStop(1, 'rgba(255,211,160,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        if (d < .2) {
            ctx.fillStyle = '#e2eee9'; ctx.shadowColor = '#d1e8ed'; ctx.shadowBlur = 28;
            ctx.beginPath(); ctx.arc(width * .78, height * .18, home ? 7 : 12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        if (scene === 'aurora') {
            ctx.filter = 'blur(22px)';
            for (let layer = 0; layer < 3; layer++) {
                ctx.beginPath();
                for (let x = -30; x <= width + 30; x += 18) {
                    const y = height * (.3 + layer * .12) + Math.sin(x / width * 5 + t * .13 + layer * 1.7) * height * (.07 + bands[0] * .08) + Math.sin(x / width * 10 - t * .09) * 18;
                    x === -30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.strokeStyle = ['rgba(104,239,211,.18)', 'rgba(127,154,255,.16)', 'rgba(220,170,237,.12)'][layer];
                ctx.lineWidth = height * (.06 + bands[1] * .05); ctx.lineCap = 'round'; ctx.shadowBlur = 45; ctx.shadowColor = ctx.strokeStyle; ctx.stroke();
            }
            ctx.filter = 'none';
        } else {
            for (let line = 0; line < 14; line++) {
                ctx.beginPath();
                for (let x = 0; x <= width + 16; x += 16) {
                    const y = height * .56 + line * height * .033 + Math.sin(x / width * 8 + t * .4 + line * .5) * (3 + bands[0] * 15);
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.lineWidth = 1; ctx.strokeStyle = `rgba(173,225,234,${.06 + line * .008})`; ctx.stroke();
            }
        }
        ctx.restore();
        // Quiet distant ridges anchor the sky in a landscape.
        for (let ridge = 0; ridge < 2; ridge++) {
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width + 16; x += 16) {
                const y = height * (.66 + ridge * .09) + Math.sin(x / width * 7 + ridge * 2) * height * .025 + Math.sin(x / width * 17 + ridge) * height * .012;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height); ctx.closePath();
            ctx.fillStyle = ridge ? `rgba(8,27,36,${.28 + d * .08})` : `rgba(28,53,66,${.3 + d * .1})`; ctx.fill();
        }
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 0;
        for (let i = 0; i < (home ? 28 : 55); i++) {
            const x = ((i * 197.3 + t * (1 + sky.wind * .06)) % width + width) % width;
            const y = height * ((Math.sin(i * 87.3) + 1) / 2) * .8;
            ctx.fillStyle = `rgba(223,245,255,${(.12 + (1 - d) * .35) * (.7 + .3 * Math.sin(t + i))})`;
            ctx.beginPath(); ctx.arc(x, y, .7 + (i % 3) * .4 + bands[2] * 1.5, 0, Math.PI * 2); ctx.fill();
        }
        if (sky.clouds) {
            for (let i = 0; i < 4; i++) {
                const x = ((i * width / 3 + t * (2 + sky.wind * .15)) % (width * 1.4)) - width * .2;
                const cloud = ctx.createRadialGradient(x, height * (.15 + i * .06), 1, x, height * (.15 + i * .06), width * .28);
                cloud.addColorStop(0, 'rgba(209,223,232,.12)'); cloud.addColorStop(1, 'rgba(209,223,232,0)');
                ctx.fillStyle = cloud; ctx.fillRect(0, 0, width, height * .6);
            }
        }
        if (sky.rain) {
            ctx.strokeStyle = 'rgba(220,239,255,.23)'; ctx.lineWidth = 1;
            for (let i = 0; i < 65; i++) {
                const x = ((i * 143 + t * sky.wind * 3) % width + width) % width;
                const y = (i * 97 + t * (sky.snow ? 22 : 240)) % height;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (sky.snow ? 1 : 3), y + (sky.snow ? 2 : 12)); ctx.stroke();
            }
        }
        ripples = ripples.filter(r => time - r.started < (still ? 1000 : 3500));
        for (const r of ripples) {
            const age = (time - r.started) / 3500;
            ctx.strokeStyle = `rgba(204,251,240,${(1 - age) * .6})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(r.x * width, r.y * height, still ? 24 : 12 + age * 150, still ? 12 : 6 + age * 65, 0, 0, Math.PI * 2); ctx.stroke();
        }
        people.forEach((person, i) => {
            const x = width * ((i + 1) / (people.length + 1)), y = height * .53 + (still ? 0 : Math.sin(t * .6 + i) * 5);
            const hue = [...person.id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 360, 0);
            const color = `hsla(${hue},80%,80%,`;
            const light = ctx.createRadialGradient(x, y, 0, x, y, 40 + bands[0] * 12);
            light.addColorStop(0, color + '.7)'); light.addColorStop(.14, color + '.2)'); light.addColorStop(1, color + '0)');
            ctx.fillStyle = light; ctx.fillRect(x - 55, y - 55, 110, 110);
        });
        ctx.restore();
    }
    function tick(time) {
        if (!alive || document.hidden) return;
        const interval = media.matches || reduced() ? 1000 : home ? 50 : 33;
        if (time - last >= interval) { elapsed += Math.min(.1, (time - (last || time)) / 1000); last = time; draw(time); }
        frame = requestAnimationFrame(tick);
    }
    const visibility = () => { cancelAnimationFrame(frame); last = 0; if (!document.hidden) frame = requestAnimationFrame(tick); };
    observer.observe(canvas); resize(); document.addEventListener('visibilitychange', visibility); frame = requestAnimationFrame(tick);
    return {
        setWeather(value) { weather = value; },
        setScene(value) { if (['aurora', 'ripple'].includes(value)) scene = value; },
        setBands(value) { bands = value; },
        setPeople(value) { people = value; },
        ripple(x, y) { ripples.push({x, y, started: performance.now()}); ripples = ripples.slice(-25); },
        destroy() { alive = false; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); }
    };
}
