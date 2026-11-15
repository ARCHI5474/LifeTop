import assert from 'node:assert/strict';
import {quickLinks,fixedBookmarks} from '../js/quick-links-data.js';
import {searchQuickLinks,pinQuickLink,isQuickLinkPinned} from '../js/quick-links.js';
import {userConfig,APP_VERSION} from '../js/config.js?v=9.0';
import {eggVersion,readVersionEggs,saveVersionEgg} from '../js/version-eggs.js';

assert.equal(APP_VERSION,'12.0.0');
assert.equal(quickLinks.length,1000);
assert.equal(new Set(quickLinks.map(item=>new URL(item.url).href.replace(/\/$/,'').toLowerCase())).size,1000);
assert.equal(Object.values(fixedBookmarks).flat().length,1000);
for(const item of quickLinks){assert.ok(item.title&&item.category&&item.kind);assert.match(item.url,/^https?:\/\//);}
assert.equal(new Set(quickLinks.map(item=>new URL(item.url).hostname.replace(/^www\./,''))).size,1000,'one entry per destination host');
assert.equal(new Set(quickLinks.map(item=>item.title.normalize('NFKC').toLowerCase())).size,1000,'no duplicate service names');
for(const item of quickLinks){
 assert.equal(item.kind,'サイト','no resource lists or software introduction entries');
 const url=new URL(item.url);
 assert.equal(url.hostname==='github.com'&&url.pathname!=='/',false,'no GitHub repository links');
 assert.equal(/(?:github\.io|githubusercontent\.com|gitlab\.com)$/.test(url.hostname),false);
 assert.doesNotMatch(item.category,/公開ソフトウェア|資料・リンク集/);
}
assert.ok(searchQuickLinks('Ｇｏｏｇｌｅ').length>0,'full-width text normalization');
assert.ok(searchQuickLinks('Google maps').every(item=>/google/i.test(item.title+' '+item.url)));
assert.equal(searchQuickLinks('no-match-86793241').length,0);
const category=quickLinks[0].category;assert.ok(searchQuickLinks('',category).every(item=>item.category===category));
const before=userConfig.bookmarks;userConfig.bookmarks=[];
globalThis.localStorage={getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}};
globalThis.document={getElementById:()=>null};
assert.throws(()=>pinQuickLink(quickLinks[0]),/保存できません/);
assert.deepEqual(userConfig.bookmarks,[],'failed pin preserves bookmarks');
userConfig.bookmarks=[{type:'folder',children:[{url:quickLinks[0].url.replace(/\/$/,'')}]}];
assert.equal(isQuickLinkPinned(quickLinks[0]),true,'pin deduplicates nested bookmarks');
userConfig.bookmarks=before;
assert.equal(eggVersion('12.0.0'),'12.0');assert.equal(eggVersion('12.0.1'),'12.0');
for(const version of ['10.0.0','11.0.0','12.1.0','12.0-beta'])assert.equal(eggVersion(version),null);
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
assert.deepEqual(readVersionEggs(storage),{schema:1,versions:{}});
const first=saveVersionEgg('12.0',storage).versions['12.0'].foundAt;
assert.equal(saveVersionEgg('12.0',storage).versions['12.0'].foundAt,first,'discovery date is stable');
assert.throws(()=>saveVersionEgg('11.0',storage));
const [key]=data.keys();data.set(key,'broken');assert.throws(()=>saveVersionEgg('12.0',storage));assert.equal(data.get(key),'broken');
console.log('PASS: v12 catalog, search, pin rollback/deduplication and version-specific egg persistence');
