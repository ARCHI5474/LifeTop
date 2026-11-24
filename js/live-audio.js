import {frequencyBands} from './live-model.js?v=14.0.0';

// Sources never connect to a network or to the microphone's speaker output.
export function createLiveAudio(onBands, onStatus) {
    let generation = 0, stream, context, source, analyser, timer, audio, url;
    function stop(message = '音への反応はオフです。') {
        generation++;
        clearInterval(timer); timer = null;
        stream?.getTracks().forEach(track => track.stop()); stream = null;
        source?.disconnect(); source = null; analyser = null;
        if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; }
        if (url) { URL.revokeObjectURL(url); url = null; }
        void context?.close().catch(() => {}); context = null;
        onBands([0, 0, 0]); onStatus(message, false);
    }
    async function start(kind, file) {
        stop(); const attempt = generation;
        try {
            if (!window.isSecureContext) throw Error('音の入力はHTTPSまたはlocalhostで利用できます。');
            let acquired;
            if (kind === 'mic') {
                if (!navigator.mediaDevices?.getUserMedia) throw Error('このブラウザではマイクを利用できません。');
                acquired = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
            }
            else if (kind === 'tab') {
                if (!navigator.mediaDevices?.getDisplayMedia) throw Error('このブラウザはタブの音声共有に対応していません。');
                acquired = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});
            }
            if (attempt !== generation || document.hidden) { acquired?.getTracks().forEach(track => track.stop()); return; }
            stream = acquired;
            if (stream && !stream.getAudioTracks().length) throw Error('音声が共有されていません。共有画面でタブの音声を有効にしてください。');
            const Engine = window.AudioContext || window.webkitAudioContext;
            if (!Engine) throw Error('このブラウザは音への反応に対応していません。');
            context = new Engine(); analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .82;
            if (kind === 'file') {
                if (!file) throw Error('音声ファイルを選択してください。');
                audio = new Audio(); url = URL.createObjectURL(file); audio.src = url;
                audio.onended = () => { if (attempt === generation) stop('音声の再生が終了しました。'); };
                source = context.createMediaElementSource(audio); source.connect(analyser); analyser.connect(context.destination);
            } else {
                source = context.createMediaStreamSource(stream); source.connect(analyser);
                for (const track of stream.getTracks()) track.addEventListener('ended', () => { if (attempt === generation) stop('音声共有を終了しました。'); });
            }
            await context.resume();
            if (attempt !== generation) return;
            if (audio) await audio.play();
            if (attempt !== generation) return;
            const bytes = new Uint8Array(analyser.frequencyBinCount);
            timer = setInterval(() => { analyser.getByteFrequencyData(bytes); onBands(frequencyBands(bytes, context.sampleRate, analyser.fftSize)); }, 50);
            onStatus(kind === 'mic' ? 'マイクに反応中 · 音声は端末内で処理します。' : kind === 'tab' ? '共有音声に反応中 · 映像・音声は送信しません。' : '音声ファイルを再生中 · 端末内で反応します。', true);
        } catch (error) {
            if (attempt !== generation) return;
            stop(error.name === 'NotAllowedError' ? '音の入力は許可されませんでした。ボタンから再試行できます。' : error.message || '音の入力を開始できませんでした。');
        }
    }
    return {start, stop};
}
