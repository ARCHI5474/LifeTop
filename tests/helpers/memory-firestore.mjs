import assert from 'node:assert/strict';
export function database() {
    const rows = new Map(); let queue = Promise.resolve();
    const ref = path => ({path, id: path.split('/').at(-1), collection: name => ({doc: id => ref(path + '/' + name + '/' + id)})});
    const snap = r => ({id: r.id, exists: rows.has(r.path), data: () => structuredClone(rows.get(r.path))});
    const db = {collection: name => ({doc: id => ref(name + '/' + id)}), runTransaction(fn) {
        const run = queue.then(async () => {
            const changes = [];
            const tx = {
                get: async r => { assert.equal(changes.length, 0, 'Firestore transactions read before writing'); return snap(r); },
                set: (r, d) => changes.push(() => rows.set(r.path, structuredClone(d))),
                create: (r, d) => changes.push(() => { assert.ok(!rows.has(r.path)); rows.set(r.path, structuredClone(d)); }),
                update: (r, d) => changes.push(() => rows.set(r.path, {...rows.get(r.path), ...structuredClone(d)})),
                delete: r => changes.push(() => rows.delete(r.path))
            };
            const result = await fn(tx); changes.forEach(change => change()); return result;
        }); queue = run.catch(() => {}); return run;
    }};
    return {db, rows};
}
