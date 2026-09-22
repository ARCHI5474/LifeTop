/* LifeTop - Quick Clock (Stopwatch & Timer with Web Audio Alarm) */

let activeTool = 'timer'; // 'timer' | 'stopwatch'

// --- タイマー状態 ---
let timerDuration = 300; // 秒（デフォルト5分）
let timerRemaining = 300;
let timerRunning = false;
let timerInterval = null;
let timerDeadline = 0;
const alarmNodes = new Set();
let alarmAudioCtx = null;
let alarmOscillatorInterval = null;

// --- ストップウォッチ状態 ---
let swStartTime = 0;
let swElapsedTime = 0;
let swRunning = false;
let swInterval = null;
let swLaps = [];

// ツールタブ切り替え
export function switchClockToolTab(tool) {
    if (!['timer', 'stopwatch'].includes(tool)) return;
    activeTool = tool;
    const timerPane = document.getElementById('clock-timer-pane');
    const swPane = document.getElementById('clock-stopwatch-pane');
    const timerBtn = document.getElementById('tool-tab-timer');
    const swBtn = document.getElementById('tool-tab-sw');
    timerBtn?.setAttribute('aria-pressed', String(tool === 'timer'));
    swBtn?.setAttribute('aria-pressed', String(tool === 'stopwatch'));

    if (tool === 'timer') {
        timerPane?.classList.add('active');
        swPane?.classList.remove('active');
        timerBtn?.classList.add('active');
        swBtn?.classList.remove('active');
    } else {
        swPane?.classList.add('active');
        timerPane?.classList.remove('active');
        swBtn?.classList.add('active');
        timerBtn?.classList.remove('active');
    }
}

// ==========================================
// タイマー機能
// ==========================================
export function setTimerPreset(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    if (timerRunning) pauseTimer();
    stopAlarmSound();
    timerDuration = Math.max(10, Math.min(10800, Math.round(minutes * 60)));
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

export function adjustTimer(seconds) {
    if (!Number.isFinite(seconds)) return;
    if (timerRunning) pauseTimer();
    stopAlarmSound();
    timerDuration = Math.max(10, Math.min(3600 * 3, timerDuration + seconds));
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

export function toggleTimer() {
    if (timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

export function startTimer() {
    if (timerRunning) return;
    if (timerRemaining <= 0) {
        timerRemaining = timerDuration;
    }
    stopAlarmSound();
    prepareAudio();
    timerRunning = true;
    updateTimerButtons();

    timerDeadline = Date.now() + timerRemaining * 1000;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerRemaining = Math.max(0, (timerDeadline - Date.now()) / 1000);
        updateTimerDisplay();

        if (timerRemaining <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            updateTimerButtons();
            onTimerComplete();
        }
    }, 250);
}

export function pauseTimer() {
    if (timerRunning) timerRemaining = Math.max(0, (timerDeadline - Date.now()) / 1000);
    timerRunning = false;
    clearInterval(timerInterval);
    updateTimerDisplay();
    updateTimerButtons();
    if (timerRemaining === 0) onTimerComplete();
}

export function resetTimer() {
    pauseTimer();
    stopAlarmSound();
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (!el) return;
    const remaining = Math.ceil(timerRemaining);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerButtons() {
    const btn = document.getElementById('timer-start-btn');
    if (!btn) return;
    btn.innerHTML = timerRunning
        ? '<span class="material-symbols-outlined">pause</span> 一時停止'
        : '<span class="material-symbols-outlined">play_arrow</span> スタート';
}

function onTimerComplete() {
    playAlarmSound();
    const banner = document.getElementById('timer-alarm-banner');
    if (banner) {
        banner.classList.add('active');
    }
}

// ==========================================
// Web Audio API アラーム音
// ==========================================
function prepareAudio() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!alarmAudioCtx) alarmAudioCtx = new AudioContextClass();
        if (alarmAudioCtx.state === 'suspended') alarmAudioCtx.resume().catch(() => {});
    } catch (error) { console.warn('Audio unavailable', error); }
}

export function playAlarmSound() {
    stopAlarmSound();
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        prepareAudio();

        const playBeepPair = () => {
            if (!alarmAudioCtx) return;
            const now = alarmAudioCtx.currentTime;

            const osc1 = alarmAudioCtx.createOscillator();
            alarmNodes.add(osc1);
            const gain1 = alarmAudioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(alarmAudioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);
            osc1.onended = () => { alarmNodes.delete(osc1); osc1.disconnect(); gain1.disconnect(); };

            const osc2 = alarmAudioCtx.createOscillator();
            alarmNodes.add(osc2);
            const gain2 = alarmAudioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1174.66, now + 0.14);
            gain2.gain.setValueAtTime(0.35, now + 0.14);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc2.connect(gain2);
            gain2.connect(alarmAudioCtx.destination);
            osc2.start(now + 0.14);
            osc2.stop(now + 0.3);
            osc2.onended = () => { alarmNodes.delete(osc2); osc2.disconnect(); gain2.disconnect(); };
        };

        playBeepPair();
        let count = 0;
        alarmOscillatorInterval = setInterval(() => {
            count++;
            if (count > 12) {
                clearInterval(alarmOscillatorInterval);
                alarmOscillatorInterval = null;
                return;
            }
            playBeepPair();
        }, 800);
    } catch (e) {
        console.warn("Alarm sound playback error", e);
    }
}

export function stopAlarmSound() {
    if (alarmOscillatorInterval) {
        clearInterval(alarmOscillatorInterval);
        alarmOscillatorInterval = null;
    }
    for (const oscillator of alarmNodes) { try { oscillator.stop(); } catch {} }
    alarmNodes.clear();
    const banner = document.getElementById('timer-alarm-banner');
    banner?.classList.remove('active');
}

// ==========================================
// ストップウォッチ機能
// ==========================================
export function toggleStopwatch() {
    if (swRunning) {
        pauseStopwatch();
    } else {
        startStopwatch();
    }
}

export function startStopwatch() {
    if (swRunning) return;
    swRunning = true;
    swStartTime = performance.now() - swElapsedTime;
    updateSwButtons();

    clearInterval(swInterval);
    swInterval = setInterval(() => {
        swElapsedTime = performance.now() - swStartTime;
        updateSwDisplay();
    }, 25);
}

export function pauseStopwatch() {
    if (swRunning) swElapsedTime = performance.now() - swStartTime;
    swRunning = false;
    clearInterval(swInterval);
    updateSwDisplay();
    updateSwButtons();
}

export function resetStopwatch() {
    pauseStopwatch();
    swElapsedTime = 0;
    swLaps = [];
    updateSwDisplay();
    renderLapList();
}

export function recordLap() {
    if (!swRunning) return;
    swElapsedTime = performance.now() - swStartTime;
    const currentLapTime = swElapsedTime;
    const prevTotal = swLaps.length > 0 ? swLaps[0].totalMs : 0;
    const diff = currentLapTime - prevTotal;

    swLaps.unshift({
        num: swLaps.length + 1,
        lapMs: diff > 0 ? diff : currentLapTime,
        totalMs: currentLapTime
    });

    renderLapList();
}

function updateSwDisplay() {
    const el = document.getElementById('stopwatch-display');
    if (!el) return;
    el.innerText = formatStopwatchTime(swElapsedTime);
}

function updateSwButtons() {
    const btn = document.getElementById('sw-start-btn');
    if (!btn) return;
    btn.innerHTML = swRunning
        ? '<span class="material-symbols-outlined">pause</span> 一時停止'
        : '<span class="material-symbols-outlined">play_arrow</span> スタート';
}

function formatStopwatchTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

function renderLapList() {
    const container = document.getElementById('stopwatch-laps');
    if (!container) return;
    if (swLaps.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = swLaps.map(lap => `
        <div class="sw-lap-item">
            <span class="lap-num">ラップ ${lap.num}</span>
            <span class="lap-split">${formatStopwatchTime(lap.lapMs)}</span>
            <span class="lap-total">${formatStopwatchTime(lap.totalMs)}</span>
        </div>
    `).join('');
}

// 初期化
export function initClockTools() {
    switchClockToolTab(activeTool);
    updateTimerDisplay();
    updateSwDisplay();
}
