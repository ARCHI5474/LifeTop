export const apps = [
    ['document','文書','レポート・表・書式・印刷PDF','Office'],
    ['sheet','表計算','数式・CSV・表の編集','Office'],
    ['slides','スライド','発表資料・全画面プレゼン','Office'],
    ['image','画像工房','形式変換・回転・容量調整','ファイル'],
    ['pdf','PDF工房','結合・ページ抽出・画像をPDFに','ファイル'],
    ['video','動画エディター','区間カット・テロップ・WebM出力','メディア'],
    ['audio','音声スタジオ','録音・区間切り出し・WAV出力','メディア'],
    ['diagram','図解ボード','図形をつなぐ・SVG出力','制作'],
    ['data','データラボ','集計・グラフ・表計算との連携','学習'],
    ['compare','比較ビューア','文章の行単位の変更を確認','学習'],
    ['text','文字ツール','文字数・置換・整形・抽出','学習'],
    ['units','計算・単位換算','長さ・重さ・温度・時間','学習'],
    ['draw','お絵描き','ペン・消しゴム・PNG保存','制作'],
    ['submit','提出チェック','形式・容量・ファイル名を確認','ファイル']
].map(([id,name,description,category]) => ({id,name,description,category}));

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false;
    const input = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (quoted) {
            if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"' && field === '') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && input[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += ch;
    }
    if (quoted) throw new Error('CSVの引用符が閉じていません。');
    if (field || row.length || !rows.length) { row.push(field); rows.push(row); }
    return rows;
}
export const toCSV = rows => '\uFEFF' + rows.map(row => row.map(value => /[",\r\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : value).join(',')).join('\r\n');
export const columnName = index => { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name; };
const coordinates = ref => { const [, col, row] = /^([A-Z]+)(\d+)$/.exec(ref) || []; if (!col || Number(row)<1) throw new Error('セル参照が不正です。'); return [Number(row) - 1, [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1]; };

// Recursive descent, not JavaScript eval. Only arithmetic, cells and aggregates.
export function evaluateCell(grid, row, col, visiting = new Set()) {
    const key = `${row}:${col}`, value = String(grid[row]?.[col] ?? '');
    if (!value.startsWith('=')) return value === '' ? 0 : Number(value);
    if (visiting.has(key) || visiting.size > 200) throw new Error('循環参照');
    visiting.add(key);
    try {
        const source = value.slice(1).toUpperCase().replace(/\s/g, '');
        const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[A-Z]+\d+|[A-Z]+|[()+*/,:^-]/g) || [];
        if (tokens.join('') !== source || tokens.length > 500) throw new Error('未対応の数式');
        let pos = 0;
        const cell = ref => { const [r,c] = coordinates(ref); if(r>=grid.length||c>=(grid[r]?.length||0))throw new Error('セル参照が範囲外です');const result = evaluateCell(grid,r,c,visiting); if (!Number.isFinite(result)) throw new Error('数値ではないセル'); return result; };
        const primary = () => {
            const token = tokens[pos++];
            if (token === '(') { const n = expression(); if (tokens[pos++] !== ')') throw new Error('括弧'); return n; }
            if (/^(?:\d|\.)/.test(token || '')) return Number(token);
            if (/^[A-Z]+\d+$/.test(token || '')) return cell(token);
            if (['SUM','AVERAGE','MIN','MAX','COUNT'].includes(token) && tokens[pos++] === '(') {
                const values = [];
                do {
                    if (/^[A-Z]+\d+$/.test(tokens[pos] || '') && tokens[pos + 1] === ':') {
                        const [r1,c1] = coordinates(tokens[pos]); const [r2,c2] = coordinates(tokens[pos + 2]); pos += 3;
                        if (Math.abs(r2-r1) * Math.abs(c2-c1) > 10000 || Math.max(r1,r2) >= grid.length || Math.max(c1,c2) >= Math.max(...grid.map(r=>r.length))) throw new Error('範囲が大きすぎます');
                        for (let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++) for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++) {
                            const raw = grid[r]?.[c];
                            if (raw !== '' && raw !== undefined) { const n = evaluateCell(grid,r,c,visiting); if (Number.isFinite(n)) values.push(n); }
                        }
                    } else values.push(expression());
                    if (tokens[pos] !== ',') break;
                    pos++;
                } while (pos < tokens.length);
                if (tokens[pos++] !== ')') throw new Error('括弧');
                if (token === 'COUNT') return values.length;
                if (!values.length) return 0;
                return token === 'SUM' ? values.reduce((a,b)=>a+b,0) : token === 'AVERAGE' ? values.reduce((a,b)=>a+b,0)/values.length : token === 'MIN' ? Math.min(...values) : Math.max(...values);
            }
            throw new Error('未対応の数式');
        };
        const power = () => { const n=primary(); return tokens[pos] === '^' ? (pos++, n ** unary()) : n; };
        const unary = () => {if(['+','-'].includes(tokens[pos])){const sign=tokens[pos++];return(sign==='-'?-1:1)*unary();}return power();};
        const term = () => { let n=unary(); while(['*','/'].includes(tokens[pos])) { const op=tokens[pos++], right=unary(); n=op==='*'?n*right:n/right; } return n; };
        const expression = () => { let n=term(); while(['+','-'].includes(tokens[pos])) {const op=tokens[pos++],right=term(); n=op==='+'?n+right:n-right;} return n; };
        const result = expression();
        if (pos !== tokens.length || !Number.isFinite(result)) throw new Error('数式を確認してください');
        return result;
    } finally { visiting.delete(key); }
}

export function pageRange(text, count) {
    const output = [];
    for (const part of String(text).split(',')) {
        if (!/^\s*\d+(?:\s*-\s*\d+)?\s*$/.test(part)) throw new Error('ページは 1,3-5 の形式で指定してください。');
        const [first,last=first] = part.trim().split('-').map(Number);
        if (first < 1 || last < first || last > count) throw new Error(`1〜${count}ページの範囲で指定してください。`);
        for(let i=first;i<=last;i++) output.push(i-1);
    }
    return output;
}
export function statistics(values) {
    const numbers = values.filter(Number.isFinite);
    if (!numbers.length) throw new Error('数値がありません。');
    const sorted=[...numbers].sort((a,b)=>a-b), sum=numbers.reduce((a,b)=>a+b,0), mean=sum/numbers.length;
    return {count:numbers.length,sum,mean,min:sorted[0],max:sorted.at(-1),median:sorted.length%2?sorted[Math.floor(sorted.length/2)]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2, deviation:Math.sqrt(numbers.reduce((a,b)=>a+(b-mean)**2,0)/numbers.length)};
}
const factors = { length:{m:1,cm:.01,mm:.001,km:1000,in:.0254,ft:.3048},mass:{kg:1,g:.001,mg:.000001,t:1000,lb:.45359237},time:{秒:1,分:60,時間:3600,日:86400},volume:{L:1,mL:.001,'m³':1000},temperature:{'℃':1,'℉':1,K:1} };
export const unitGroups = factors;
export function convertUnit(value,group,from,to) {
    if (!Number.isFinite(value) || !factors[group]?.[from] || !factors[group]?.[to]) throw new Error('値と単位を確認してください。');
    if(group==='temperature') { const c=from==='℃'?value:from==='℉'?(value-32)*5/9:value-273.15; return to==='℃'?c:to==='℉'?c*9/5+32:c+273.15; }
    return value*factors[group][from]/factors[group][to];
}
export function wavBlob(channels,sampleRate) {
    const length=channels[0]?.length || 0, count=channels.length;
    const buffer=new ArrayBuffer(44+length*count*2), view=new DataView(buffer);
    const write=(at,text)=>[...text].forEach((ch,i)=>view.setUint8(at+i,ch.charCodeAt(0)));
    write(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,length*count*2,true);
    for(let i=0;i<length;i++)for(let c=0;c<count;c++){const v=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*count+c)*2,v<0?v*32768:v*32767,true);}
    return new Blob([buffer],{type:'audio/wav'});
}
export function lineDiff(before,after) {
    const a=String(before).split('\n'),b=String(after).split('\n');
    if(a.length>1000||b.length>1000)throw new Error('比較はそれぞれ1000行までです。');
    const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    const result=[];let i=0,j=0;
    while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){result.push({type:'same',text:a[i++]});j++;}else if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))result.push({type:'added',text:b[j++]});else result.push({type:'removed',text:a[i++]});}
    return result;
}
