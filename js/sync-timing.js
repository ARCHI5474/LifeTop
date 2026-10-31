export const SYNC_VISITS_KEY = 'lifetop_sync_visits_v1';
export const SYNC_TIMINGS = ['every3', 'everyVisit', 'live', 'manual'];
export function normalizeSyncTiming(value) { return SYNC_TIMINGS.includes(value) ? value : 'every3'; }
export function automaticSyncDue(mode, visit, firstLogin = false) {
    if (firstLogin) return true;
    return mode === 'live' || mode === 'everyVisit' || (mode === 'every3' && visit % 3 === 0);
}
export function beginSyncVisit(storage, uid) {
    let counts = {};
    try { const value=JSON.parse(storage.getItem(SYNC_VISITS_KEY)||'{}'); if(value && typeof value==='object' && !Array.isArray(value)) counts=value; } catch {}
    const previous = Object.hasOwn(counts,uid) && Number.isSafeInteger(counts[uid]) && counts[uid]>=0 ? counts[uid] : 0;
    const visit = previous < Number.MAX_SAFE_INTEGER ? previous+1 : 1;
    Object.defineProperty(counts,uid,{value:visit,enumerable:true,writable:true,configurable:true});
    storage.setItem(SYNC_VISITS_KEY,JSON.stringify(counts));
    return visit;
}
