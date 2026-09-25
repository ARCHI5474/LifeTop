import assert from 'node:assert/strict';

const elements = new Map();
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        value: '', textContent: '', innerHTML: '', hidden: true,
        style: {}, focus() {}, setAttribute() {},
    });
    return elements.get(id);
}
globalThis.document = {
    getElementById: element,
    querySelector: selector => selector === '.notice-tag' ? element('notice-tag') : null,
    querySelectorAll: () => [],
};
let saved = null;
globalThis.localStorage = {
    getItem: () => saved,
    setItem: (_key, value) => { saved = value; },
};
const { userConfig } = await import('../js/config.js?v=4.0.1');
const tasks = await import('../js/todo.js?v=4.0.1');
const storage = await import('../js/storage.js?v=4.0.1');
userConfig.todoList = [];
const originalNow = Date.now;
Date.now = () => 1000;
for (const text of ['最初のタスク', '<script>not executable</script>']) {
    element('todo-input').value = text;
    tasks.addTodo();
}
Date.now = originalNow;
assert.equal(new Set(userConfig.todoList.map(todo => todo.id)).size, 2, 'rapid additions must have unique IDs');
assert.match(element('todo-list').innerHTML, /&lt;script&gt;/, 'task text must be escaped');
tasks.toggleTodo(1000);
tasks.setTodoFilter('active');
assert.doesNotMatch(element('todo-list').innerHTML, /最初のタスク/);
assert.match(element('todo-summary').textContent, /残り 1 件/);
assert.equal(element('todo-progress').value, 1);
tasks.setTodoFilter('completed');
assert.match(element('todo-list').innerHTML, /最初のタスク/);
tasks.deleteTodo(1000);
assert.equal(userConfig.todoList.length, 1);
assert.equal(element('todo-undo').hidden, false);
tasks.undoDeleteTodo();
assert.equal(userConfig.todoList[0].id, 1000, 'undo restores original position and completion');
assert.equal(userConfig.todoList[0].completed, true);
tasks.undoDeleteTodo();
assert.equal(userConfig.todoList.length, 2, 'undo can only be applied once');
element('todo-input').value = '新しい未完了タスク';
tasks.addTodo();
assert.match(element('todo-list').innerHTML, /新しい未完了タスク/, 'new task remains visible when adding from completed filter');
assert.equal(JSON.parse(saved).todoList.length, 3);

const originalError = console.error;
console.error = () => {};
localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
assert.equal(storage.save(), false);
assert.equal(element('storage-status').hidden, false);
localStorage.getItem = () => { throw new Error('SecurityError'); };
assert.doesNotThrow(() => storage.loadData(), 'blocked storage must not prevent startup');
localStorage.setItem = (_key, value) => { saved = value; };
assert.equal(storage.save(), true);
assert.equal(element('storage-status').hidden, true);
console.error = originalError;
console.log('PASS: task filtering, rapid additions, escaping, delete/undo, persistence, blocked storage and recovery');
