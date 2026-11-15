import fs from 'node:fs/promises';

// The catalog contains destinations, never repositories or resource-list pages.
const sources = [
 {file:'design-services.md',url:'https://raw.githubusercontent.com/bradtraversy/design-resources-for-developers/master/readme.md',categories:{'UI Graphics':'イラスト・素材','Fonts':'フォント','Colors':'配色','Icons':'アイコン','Logos':'ロゴ制作','Favicons':'アイコン制作','Stock Photos':'写真素材','Stock Videos':'動画素材','Stock Music & Sound Effects':'音楽・効果音','Vectors & Clip Art':'イラスト・素材','Product & Image Mockups':'モックアップ制作','Online Design Tools':'デザインツール','Image Compression':'画像圧縮','AI Graphic Design Tools':'AI画像制作'}},
 {file:'free-for-dev.md',url:'https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md',categories:{'Tools for Teams and Collaboration':'チーム・共同作業','CMS':'ブログ・サイト制作','Code Generation':'開発ツール','Code Quality':'コード検査','Code Search and Browsing':'開発ツール','Testing':'Webテスト','Security and PKI':'セキュリティ','Authentication, Authorization, and User Management':'ログイン・認証','Management System':'仕事・管理','Translation Management':'翻訳・多言語','Monitoring':'サイト監視','Search':'検索ツール','Education and Career Development':'学習・キャリア','Email':'メール','Font':'フォント','Forms':'フォーム・アンケート','Generative AI':'AI関連','CDN and Protection':'サイト公開・配信','PaaS':'サイト公開・配信','BaaS':'アプリ制作','Low-code Platform':'ノーコード制作','Web Hosting':'サイト公開・配信','DNS':'ドメイン管理','Domain':'ドメイン管理','Issue Tracking and Project Management':'プロジェクト管理','Storage and Media Processing':'ファイル・メディア','Design and UI':'デザインツール','Data Visualization on Maps':'地図・可視化','IDE and Code Editing':'コード編集','Analytics, Events and Statistics':'アクセス解析','Dev Blogging Sites':'ブログ・サイト制作','Remote Desktop Tools':'リモート操作'}}
];
const entries=[],seen=new Set();
const blocked=/(?:github\.io|githubusercontent\.com|gitlab\.com|bitbucket\.org|medium\.com|dev\.to|notion\.(?:so|site)|invisionapp\.com|glitch\.com|kinlove\.ai)$/i;
const isRepository=url=>url.hostname==='github.com'&&url.pathname!=='/';
function add(category,title,value,source='curated'){
 let url;try{url=new URL(value);}catch{return;}
 if(!['https:','http:'].includes(url.protocol)||blocked.test(url.hostname)||isRepository(url)||/^(?:docs?|blog|help|support|wiki|learn)\./.test(url.hostname))return;
 if(/(?:awesome|resource list|resources for|curated list|cheat.?sheet|tutorial|guide|nsfw|porn|torrent|adult|offensive|storybook)/i.test(title))return;
 const host=url.hostname.toLowerCase().replace(/^www\./,'');if(seen.has(host))return;
 seen.add(host);entries.push({category,title:title.replace(/\\/g,'').trim(),url:url.href,kind:'サイト',source});
}
for(const file of ['quick-links-seed.json','quick-links-curated.json']){
 const groups=JSON.parse(await fs.readFile(new URL('../js/'+file,import.meta.url),'utf8'));
 for(const [category,rows]of Object.entries(groups))for(const item of rows)add(category,item.title,item.url);
}
const supplemental=new Map();
for(const source of sources){
 let text;try{text=await fs.readFile(new URL('../test-artifacts/'+source.file,import.meta.url),'utf8');}catch{const response=await fetch(source.url);if(!response.ok)throw Error('Source '+response.status);text=await response.text();}
 let heading='';for(const line of text.split('\n')){
  if(/^## /.test(line))heading=line.slice(3).trim();
  const category=source.categories[heading];if(!category)continue;
  const match=line.match(/^\s*(?:\*|-|\|)\s*\[([^\]]+)\]\((https?:[^\s)]+)\)/);if(!match)continue;
  let url;try{url=new URL(match[2]);}catch{continue;}
  if(/\/(?:blog|articles?|resources?|guides?|tutorials?|lists?|docs?|awesome|pricing|features|compare)(?:\/|$)/i.test(url.pathname))continue;
  if(!supplemental.has(category))supplemental.set(category,[]);
  supplemental.get(category).push([match[1],url.origin+'/',source.file]);
 }
}
for(let index=0;;index++){
 let found=false;for(const [category,rows]of supplemental){if(!rows[index])continue;found=true;const [title,url,source]=rows[index];add(category,title,url,source);}
 if(!found)break;
}
await fs.writeFile(new URL('../test-artifacts/quick-link-candidates.json',import.meta.url),JSON.stringify(entries,null,2));
if(process.argv.includes('--verify')||process.argv.includes('--reuse-checks')){
 let cursor=0,finished=0;const checks=new Array(entries.length);
 async function worker(){while(cursor<entries.length){const index=cursor++,item=entries[index];let status=0,finalURL=item.url;
  try{let response=await fetch(item.url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(9000),headers:{'User-Agent':'Mozilla/5.0 LifeTop-LinkCheck'}});status=response.status;finalURL=response.url;
   if(status===405){response=await fetch(item.url,{redirect:'follow',signal:AbortSignal.timeout(9000)});status=response.status;finalURL=response.url;await response.body?.cancel();}
  }catch{}
  const url=new URL(finalURL);const accepted=status>=200&&status<400||[401,403,429].includes(status);
  checks[index]={url:item.url,status,finalURL,accepted:accepted&&!isRepository(url)&&!blocked.test(url.hostname)&&!/(?:sedoparking|afternic|hugedomains|dan\.com|expired)/i.test(finalURL)};
  if(++finished%100===0)console.log('Checked '+finished+'/'+entries.length);
 }}
 if(process.argv.includes('--reuse-checks')){
  const previous=JSON.parse(await fs.readFile(new URL('../test-artifacts/quick-link-checks.json',import.meta.url),'utf8'));
  const byURL=new Map(previous.map(check=>[check.url,check]));
  entries.forEach((item,index)=>checks[index]=byURL.get(item.url)||{accepted:false});
 }else{
  await Promise.all(Array.from({length:20},worker));
  await fs.writeFile(new URL('../test-artifacts/quick-link-checks.json',import.meta.url),JSON.stringify(checks,null,2));
 }
 const names=new Set(),destinations=new Set();
 const accepted=entries.filter((item,index)=>{
  if(!checks[index].accepted)return false;
  const name=item.title.normalize('NFKC').toLowerCase();
  const target=new URL(checks[index].finalURL);
  const destination=/^(?:accounts\.google\.com|login\.|auth\.)/.test(target.hostname)?item.url:target.hostname.replace(/^www\./,'')+target.pathname.replace(/\/$/,'');
  if(names.has(name)||destinations.has(destination))return false;
  names.add(name);destinations.add(destination);return true;
 });
 if(accepted.length<1000)throw Error('Only '+accepted.length+' reachable destinations; add more actual sites.');
 await fs.writeFile(new URL('../js/quick-links-approved.json',import.meta.url),JSON.stringify(accepted.slice(0,1000).map(({source,...item})=>item),null,2)+'\n');
}
let approved;try{approved=JSON.parse(await fs.readFile(new URL('../js/quick-links-approved.json',import.meta.url),'utf8'));}catch{console.log(entries.length+' destination candidates; run with --verify to build the approved catalog.');process.exit(0);}
if(approved.length!==1000||new Set(approved.map(item=>new URL(item.url).hostname.replace(/^www\./,''))).size!==1000)throw Error('Expected 1000 unique destinations');
await fs.writeFile(new URL('../js/quick-links-data.js',import.meta.url),'// Direct websites only. Source notes: QUICK_LINKS_SOURCES.md\nexport const quickLinks = '+JSON.stringify(approved,null,2)+';\nexport const fixedBookmarks = Object.groupBy(quickLinks, item => item.category);\n');
console.log('Built '+approved.length+' direct websites, '+new Set(approved.map(item=>item.category)).size+' categories');
