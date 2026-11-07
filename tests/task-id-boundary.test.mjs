import assert from 'node:assert/strict';
const elements = new Map();
globalThis.document = {
    getElementById(id) {
        if (!elements.has(id)) elements.set(id, {value:'',innerHTML:'',style:{},hidden:true,focus(){}});
        return elements.get(id);
    },
    querySelector() { return null; },
    dispatchEvent() {},
};
let stored = null;
globalThis.localStorage = {getItem:() => stored, setItem:(_key,value) => {stored=value;}};
const {userConfig, mergeUserConfig} = await import('../js/config.js?v=9.0');
const {addTodo} = await import('../js/todo.js?v=9.1');
userConfig.todoList = [
    {id:Number.MAX_SAFE_INTEGER,text:'旧データの大きいID',completed:false},
    {id:Number.MAX_SAFE_INTEGER-1,text:'もう一つの大きいID',completed:false},
];
for (const text of ['追加したタスクA','追加したタスクB']) {
    document.getElementById('todo-input').value = text;
    addTodo();
}
assert.ok(userConfig.todoList.every(task => Number.isSafeInteger(task.id)), 'new task IDs must remain safely persistable');
assert.equal(new Set(userConfig.todoList.map(task => task.id)).size, 4);
mergeUserConfig(JSON.parse(stored));
assert.equal(userConfig.todoList.length, 4, 'reload must retain new tasks beside boundary IDs');
console.log('PASS: task IDs remain unique and survive reload at safe-integer boundaries');
