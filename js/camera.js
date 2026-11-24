import {openUIDialog} from './ui-dialog.js?v=14.0.0';

export function openCamera(){
    if(document.getElementById('camera-dialog'))return;
    const dialog=document.createElement('dialog');
    dialog.id='camera-dialog';dialog.className='cc-dialog v12-dialog camera-dialog ui-scope';
    dialog.setAttribute('aria-labelledby','camera-title');
    dialog.innerHTML='<header class="v12-dialog-header"><div><h2 id="camera-title">カメラ</h2><p>撮影した写真はこの端末に保存できます。</p></div><button type="button" class="cc-control cc-icon" data-cancel aria-label="カメラを閉じる"></button></header><div class="camera-content"><video id="camera-video" autoplay playsinline muted aria-label="カメラのプレビュー"></video><p id="camera-status" role="status" aria-live="polite">カメラを準備しています…</p><div class="camera-actions"><button type="button" class="primary-btn" id="camera-capture" disabled>写真を撮る</button><button type="button" class="tonal-btn" id="camera-switch" disabled>背面カメラに切替</button><button type="button" class="tonal-btn" id="camera-retry" hidden>カメラを開始</button></div><figure id="camera-photo" hidden><img alt="撮影した写真"><figcaption><a id="camera-download" class="tonal-btn" download>写真を保存</a></figcaption></figure><p class="v12-caption">映像・写真をサーバーへ送信することはありません。カメラの利用にはHTTPS接続とブラウザの許可が必要です。パネルを閉じるとカメラを停止します。</p></div>';
    document.body.append(dialog);openUIDialog(dialog);
    const $=selector=>dialog.querySelector(selector),video=$('video'),status=$('#camera-status');
    const capture=$('#camera-capture'),swap=$('#camera-switch'),retry=$('#camera-retry');
    let stream=null,facing='user',generation=0,photoURL=null,disposed=false;
    function stop(){generation++;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;capture.disabled=true;swap.disabled=true;}
    async function start(){
        stop();const request=generation;retry.hidden=true;
        status.textContent='カメラの許可を確認しています…';
        try{
            if(!navigator.mediaDevices?.getUserMedia)throw Error('カメラに対応していない環境です。HTTPSのChrome・Edge・Safariなどで開いてください。');
            const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}},audio:false});
            if(disposed||request!==generation||!dialog.open){next.getTracks().forEach(track=>track.stop());return;}
            stream=next;video.srcObject=stream;
            await video.play();
            if(disposed||request!==generation)return;
            const actual=stream.getVideoTracks()[0]?.getSettings().facingMode;
            video.classList.toggle('is-mirrored',(actual||facing)==='user');
            const ready=()=>{if(disposed||request!==generation)return;capture.disabled=!video.videoWidth;swap.disabled=false;status.textContent='撮影できます。';};
            if(video.videoWidth)ready();else video.addEventListener('loadeddata',ready,{once:true});
            swap.textContent=facing==='user'?'背面カメラに切替':'前面カメラに切替';
            stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(request!==generation)return;stop();status.textContent='カメラが停止しました。再開できます。';retry.hidden=false;},{once:true});
        }catch(error){
            if(disposed||request!==generation)return;
            stop();retry.hidden=false;
            status.textContent=({NotAllowedError:'カメラの利用が許可されていません。ブラウザのサイト設定で許可して再試行してください。',NotFoundError:'カメラが見つかりません。接続を確認してください。',NotReadableError:'カメラを開始できません。ほかのアプリが使用していないか確認してください。',OverconstrainedError:'このカメラでは指定した撮影条件を利用できません。'})[error.name]||error.message;
        }
    }
    capture.onclick=()=>{
        if(!stream||!video.videoWidth||capture.disabled)return;
        const request=generation,canvas=document.createElement('canvas');
        canvas.width=video.videoWidth;canvas.height=video.videoHeight;
        const context=canvas.getContext('2d');
        if(video.classList.contains('is-mirrored')){context.translate(canvas.width,0);context.scale(-1,1);}
        context.drawImage(video,0,0);capture.disabled=true;
        canvas.toBlob(blob=>{
            if(disposed||request!==generation)return;
            capture.disabled=false;
            if(!blob){status.textContent='撮影できませんでした。もう一度お試しください。';return;}
            if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(blob);
            $('#camera-photo img').src=photoURL;$('#camera-photo').hidden=false;
            const download=$('#camera-download');download.href=photoURL;download.download='LifeTop-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';
            status.textContent='撮影しました。「写真を保存」でダウンロードできます。';download.focus();
        },'image/png');
    };
    swap.onclick=()=>{facing=facing==='user'?'environment':'user';void start();};retry.onclick=()=>void start();
    function dispose(){disposed=true;stop();if(photoURL)URL.revokeObjectURL(photoURL);window.removeEventListener('pagehide',dispose);document.removeEventListener('visibilitychange',hide);}
    function hide(){if(document.hidden){stop();retry.hidden=false;status.textContent='画面を離れたためカメラを停止しました。再開するには「カメラを開始」を押してください。';}}
    dialog.addEventListener('close',dispose,{once:true});window.addEventListener('pagehide',dispose);document.addEventListener('visibilitychange',hide);
    void start();
}
export function initCamera(){document.getElementById('camera-open')?.addEventListener('click',openCamera);}
