import {DEFAULT_SETTINGS, DEFAULT_CONTENT} from './config.js?v=8.0';
import {canonicalJson} from './sync-engine.js?v=8.0';

const same = (a,b) => canonicalJson(a) === canonicalJson(b);
const comparable = data => Object.fromEntries(Object.entries(data).filter(([key])=>key!=='syncTiming'));
const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function mergeInitialData(local, cloud) {
    const defaults = {...DEFAULT_SETTINGS,...DEFAULT_CONTENT};
    if (same(comparable(local),comparable(defaults))) return cloud;
    if (same(comparable(cloud),comparable(defaults))) return local;
    const merged = structuredClone(cloud);
    for (const [key,value] of Object.entries(DEFAULT_SETTINGS)) {
        if (key === 'syncTiming') continue;
        if (same(cloud[key],value) && !same(local[key],value)) merged[key] = local[key];
    }
    const ids = new Set(merged.todoList.map(todo => todo.id));
    const localTodos = same(local.todoList,DEFAULT_CONTENT.todoList) ? [] : local.todoList;
    for (const todo of localTodos) {
        if (merged.todoList.some(existing => same(existing,todo))) continue;
        const next = {...todo};
        if (ids.has(next.id)) {
            next.id = Date.now();
            while (ids.has(next.id)) next.id++;
        }
        ids.add(next.id); merged.todoList.push(next);
    }
    const localBookmarks = same(local.bookmarks,DEFAULT_CONTENT.bookmarks) ? [] : local.bookmarks;
    for (const entry of localBookmarks) {
        if (entry.type !== 'folder') {
            if (!merged.bookmarks.some(item => item.type !== 'folder' && item.url === entry.url && item.title === entry.title)) merged.bookmarks.push({...entry});
            continue;
        }
        const existing = merged.bookmarks.find(item => item.type === 'folder' && item.id === entry.id && item.title === entry.title);
        if (existing) {
            for (const child of entry.children) if (!existing.children.some(item => same(item,child))) existing.children.push({...child});
        } else {
            const next = structuredClone(entry);
            while (merged.bookmarks.some(item => item.id === next.id)) next.id += '_local';
            merged.bookmarks.push(next);
        }
    }
    if (local.memo && local.memo !== cloud.memo) {
        if (!cloud.memo) { merged.memo = local.memo; merged.memoHtml = local.memoHtml; }
        else {
            const divider = '\n\n── この端末から移行したメモ ──\n\n';
            merged.memo = cloud.memo + divider + local.memo;
            merged.memoHtml = `<div>${cloud.memoHtml || escape(cloud.memo).replace(/\n/g,'<br>')}</div><p>── この端末から移行したメモ ──</p><div>${local.memoHtml || escape(local.memo).replace(/\n/g,'<br>')}</div>`;
        }
    }
    return merged;
}
