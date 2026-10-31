export function percentile(samples, fraction) {
    const values=samples.filter(value=>Number.isFinite(value)&&value>=0).sort((a,b)=>a-b);
    return values.length?values[Math.max(0,Math.ceil(values.length*fraction)-1)]:null;
}

export function probeStorage(storage, key) {
    let success=false;
    let owned=false;
    try {
        if(storage.getItem(key)!==null)return false;
        storage.setItem(key,'LifeTop stability check');
        owned=true;
        success=storage.getItem(key)==='LifeTop stability check';
    } catch { /* Storage may be blocked or full. */ }
    finally {if(owned)try{storage.removeItem(key);}catch{success=false;}}
    return success;
}

export function summarizeStability({frames,delays,storageOK,missing=[]}) {
    frames=frames.filter(value=>Number.isFinite(value)&&value>0);
    delays=delays.filter(value=>Number.isFinite(value)&&value>=0);
    const median=percentile(frames,.5), frame95=percentile(frames,.95), delay95=percentile(delays,.95);
    const enough=frames.length>=20&&delays.length>=10;
    const slowFrames=frames.filter(value=>value>Math.max(50,(median||16.7)*2.5)).length/Math.max(1,frames.length);
    const drawing=!enough?'unknown':median>45||frame95>100||slowFrames>.1?'attention':'good';
    const response=!enough?'unknown':delay95>100?'attention':'good';
    const rows=[
        {name:'描画の滑らかさ',state:drawing,value:median===null?'測定できませんでした':`描画間隔 中央値 ${median.toFixed(1)}ms / 95%値 ${frame95.toFixed(1)}ms`,advice:drawing==='good'?'測定中、大きな描画の乱れは見られませんでした。':'ほかのタブや重いアプリを閉じ、「動きを減らす」を試してください。省電力設定でも値は変わります。'},
        {name:'操作への応答',state:response,value:delay95===null?'測定できませんでした':`タイマー遅延 95%値 ${delay95.toFixed(1)}ms`,advice:response==='good'?'測定中、短い処理の待ち時間は小さい状態でした。':'バックグラウンドの処理や拡張機能を見直し、画面を開いたまま再検証してください。'},
        {name:'端末内への保存',state:storageOK?'good':'problem',value:storageOK?'書き込み・読み取り・削除を確認':'保存を確認できませんでした',advice:storageOK?'小さなテストデータで確認しました。残り容量や長期保存を保証するものではありません。':'サイトのデータ保存を許可し、空き容量を確認してください。大切な内容はJSONバックアップにも保存してください。'},
        {name:'LifeTopに必要な表示機能',state:missing.length?'attention':'good',value:missing.length?`未対応：${missing.join('・')}`:'必要な表示機能を確認',advice:missing.length?'ブラウザを更新するか、最新版のChrome・Edge・Safari・Firefoxでお試しください。':'検出できた機能の有無です。すべての画面の実動作を保証するものではありません。'}
    ];
    const state=!storageOK?'problem':missing.length||drawing==='attention'||response==='attention'?'attention':!enough?'unknown':'good';
    const titles={good:'この画面では安定した動作が見られました',attention:'動作を改善できる項目があります',problem:'端末内への保存に確認が必要です',unknown:'十分な測定ができませんでした'};
    return {state,title:titles[state],rows};
}

// A bounded, light check of the current page, never a CPU stress test.
export function collectStabilitySamples({signal,onProgress=()=>{},duration=3000,runtime}) {
    return new Promise((resolve,reject)=>{
        const frames=[],delays=[];
        const start=runtime.now();
        let previous=null, raf, tick, finish, settled=false;
        const cleanup=()=>{runtime.cancelFrame(raf);runtime.clearTimer(tick);runtime.clearTimer(finish);signal?.removeEventListener('abort',abort);};
        const abort=()=>{
            if(settled)return;settled=true;cleanup();
            const error=new Error('検証を中断しました');error.name='AbortError';reject(error);
        };
        const frame=()=>{
            if(settled)return;
            const now=runtime.now();
            if(previous!==null&&now-start>=400)frames.push(now-previous);
            previous=now;raf=runtime.frame(frame);
        };
        const scheduleTick=()=>{
            const expected=runtime.now()+80;
            tick=runtime.timer(()=>{
                if(settled)return;
                if(runtime.now()-start>=400)delays.push(Math.max(0,runtime.now()-expected));
                onProgress(Math.min(1,(runtime.now()-start)/duration));scheduleTick();
            },80);
        };
        if(signal?.aborted){abort();return;}
        signal?.addEventListener('abort',abort,{once:true});
        raf=runtime.frame(frame);scheduleTick();
        finish=runtime.timer(()=>{
            if(settled)return;settled=true;cleanup();onProgress(1);resolve({frames,delays});
        },duration);
    });
}

export function initStabilityCheck() {
    const trigger=document.getElementById('stability-check-open');
    const dialog=document.getElementById('stability-check');
    const start=document.getElementById('stability-check-start');
    const title=document.getElementById('stability-check-status');
    const results=document.getElementById('stability-check-results');
    const progress=document.getElementById('stability-check-progress');
    let controller=null;
    const stop=()=>controller?.abort();
    const close=()=>{stop();dialog.close();trigger.focus({preventScroll:true});};
    trigger.addEventListener('click',()=>dialog.showModal());
    document.getElementById('stability-check-close').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    start.addEventListener('click',async()=>{
        if(controller)return;
        controller=new AbortController();
        start.disabled=true;results.replaceChildren();progress.hidden=false;progress.value=0;
        title.textContent='検証中です。この画面を開いたまま約3秒お待ちください。';
        dialog.setAttribute('aria-busy','true');
        try {
            const key=`lifetop_stability_probe_${globalThis.crypto?.randomUUID?.() || Date.now()+'_'+Math.random().toString(36).slice(2)}`;
            let storageOK=false;
            try{storageOK=probeStorage(localStorage,key);}catch{}
            const missing=[];
            if(typeof ResizeObserver==='undefined')missing.push('自動レイアウト調整');
            if(!globalThis.CSS?.supports?.('container-type','size'))missing.push('盤面の自動サイズ調整');
            if(!globalThis.CSS?.supports?.('color','color-mix(in srgb, black, white)'))missing.push('テーマ色の調整');
            const samples=await collectStabilitySamples({signal:controller.signal,onProgress:value=>progress.value=value,runtime:{
                now:()=>performance.now(),frame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id),timer:(fn,ms)=>setTimeout(fn,ms),clearTimer:id=>clearTimeout(id)
            }});
            const report=summarizeStability({...samples,storageOK,missing});
            title.textContent=report.title;results.dataset.state=report.state;
            const labels={good:'良好',attention:'見直しの目安',problem:'要確認',unknown:'測定不足'};
            for(const row of report.rows){
                const card=document.createElement('section');card.className='stability-result';card.dataset.state=row.state;
                const heading=document.createElement('h3');heading.textContent=`${row.name} · ${labels[row.state]}`;
                const value=document.createElement('p');value.className='stability-metric';value.textContent=row.value;
                const advice=document.createElement('p');advice.textContent=row.advice;
                card.append(heading,value,advice);results.append(card);
            }
            const time=document.createElement('p');time.className='settings-help';time.textContent=`今回の測定：${new Date().toLocaleTimeString('ja-JP')} · 結果は端末内のこの画面にのみ表示します。`;results.append(time);
        } catch(error) {
            title.textContent=error.name==='AbortError'?'検証を中断しました。画面を開いたまま、もう一度お試しください。':'検証できませんでした。ページを再読み込みしてお試しください。';
        } finally {
            controller=null;start.disabled=false;start.textContent='もう一度チェック';progress.hidden=true;dialog.setAttribute('aria-busy','false');
        }
    });
}
