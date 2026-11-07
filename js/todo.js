/* LifeTop - todo list */
import { userConfig } from "./config.js?v=9.0";
import { save } from "./storage.js?v=9.0";

let deletedTodo = null;

function saveTodos(before) {
    if (save()) return true;
    userConfig.todoList = before;
    renderTodoList();
    return false;
}

export function clearTodoUndo() {
    deletedTodo = null;
    document.getElementById('todo-undo').hidden = true;
}

export function initUtilityTabs() {
    const tabs = [...document.querySelectorAll('.utility-tabs .tab-btn')];
    tabs.forEach((tab, index) => {
        tab.id = `utility-tab-${tab.dataset.tab}`;
        tab.setAttribute('aria-controls', `${tab.dataset.tab}-tab-content`);
        const panel = document.getElementById(`${tab.dataset.tab}-tab-content`);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            switchUtilityTab(tabs[next].dataset.tab);
            tabs[next].focus();
        });
    });
    switchUtilityTab('todo');
}

export function switchUtilityTab(tabName) {
    if (!['todo', 'memo', 'clock'].includes(tabName)) return;
    document.querySelectorAll('.utility-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', String(btn.dataset.tab === tabName));
        btn.tabIndex = btn.dataset.tab === tabName ? 0 : -1;
    });

    document.querySelectorAll('.utility-card .tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetBtn = document.querySelector(`.utility-tabs button[data-tab="${tabName}"]`) ||
        (tabName === 'todo' ? document.querySelector(".utility-tabs button:nth-child(1)") :
         tabName === 'memo' ? document.querySelector(".utility-tabs button:nth-child(2)") :
         document.querySelector(".utility-tabs button:nth-child(3)"));

    targetBtn?.classList.add('active');
    const content = document.getElementById(`${tabName}-tab-content`);
    content?.classList.add('active');
}

// ToDo操作
export function renderTodoList() {
    const list = document.getElementById('todo-list');
    const todos = userConfig.todoList || [];
    if (todos.length === 0) {
        list.innerHTML = '<li class="todo-empty">タスクはありません。上から追加できます。</li>';
        return;
    }

    list.innerHTML = todos.map(t => {
        const completedClass = t.completed ? 'completed' : '';
        return `
            <li class="todo-item ${completedClass}" id="todo-item-${t.id}">
                <label class="todo-item-left">
                    <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${t.id})">
                    <span class="todo-text">${escapeHtml(t.text)}</span>
                </label>
                <div class="todo-item-actions">
                    <button type="button" class="todo-delete" aria-label="${escapeHtml(t.text)}を削除" onclick="deleteTodo(${t.id})">
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            </li>
        `;
    }).join('');
    document.dispatchEvent?.(new Event('lifetop:tasks-rendered'));
}

export function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    const newTodo = {
        id: nextTodoId(),
        text: text,
        completed: false,
        description: '', status: 'todo', due: '', projectId: '', fileId: '',
        createdAt: Date.now(), updatedAt: Date.now(), completedAt: null
    };

    if (!userConfig.todoList) userConfig.todoList = [];
    const before = userConfig.todoList.slice();
    userConfig.todoList.push(newTodo);
    if (!saveTodos(before)) return;
    renderTodoList();
    input.value = "";
    input.focus();
}

export function nextTodoId() {
    const pending = deletedTodo?.batch?.map(entry => entry.todo) || (deletedTodo?.todo ? [deletedTodo.todo] : []);
    const todos = [...(userConfig.todoList || []), ...pending];
    const used = new Set(todos.map(todo => todo.id));
    let next = todos.reduce((value, todo) => Number.isSafeInteger(todo.id + 1)
        ? Math.max(value, todo.id + 1) : value, Date.now());
    while (used.has(next)) next = next === Number.MAX_SAFE_INTEGER ? 0 : next + 1;
    return next;
}

export function toggleTodo(id) {
    const todo = userConfig.todoList.find(t => t.id === id);
    if (todo) {
        const before = userConfig.todoList.map(t => ({ ...t }));
        todo.completed = !todo.completed;
        todo.status = todo.completed ? 'done' : 'todo';
        todo.updatedAt = Date.now();
        todo.completedAt = todo.completed ? Date.now() : null;
        if (!saveTodos(before)) return;
        renderTodoList();
        (document.querySelector(`#todo-item-${id} input`) || document.getElementById('todo-input')).focus();
    }
}

export function deleteTodo(id) {
    const index = userConfig.todoList.findIndex(todo => todo.id === id);
    if (index < 0) return;
    const pendingDelete = { todo: userConfig.todoList[index], index };
    const before = userConfig.todoList;
    userConfig.todoList = userConfig.todoList.filter(t => t.id !== id);
    if (!saveTodos(before)) return;
    deletedTodo = pendingDelete;
    renderTodoList();
    document.getElementById('todo-undo').hidden = false;
    document.querySelector('#todo-undo button')?.focus();
}

export function undoDeleteTodo() {
    if (!deletedTodo) return;
    const before = userConfig.todoList.slice();
    let focusId = null;
    if (Array.isArray(deletedTodo.batch)) {
        for (const entry of deletedTodo.batch) {
            const insertAt = Math.min(entry.index, userConfig.todoList.length);
            userConfig.todoList.splice(insertAt, 0, entry.todo);
            focusId = entry.todo.id;
        }
    } else if (deletedTodo.todo) {
        userConfig.todoList.splice(deletedTodo.index, 0, deletedTodo.todo);
        focusId = deletedTodo.todo.id;
    }
    if (!saveTodos(before)) return;
    deletedTodo = null;
    document.getElementById('todo-undo').hidden = true;
    renderTodoList();
    (document.querySelector(`#todo-item-${focusId} input`) || document.getElementById('todo-input')).focus();
}

export function escapeHtml(string) {
    if (typeof string !== 'string') {
        return string;
    }
    return string.replace(/[&'`"<>]/g, function(match) {
        return {
            '&': '&amp;',
            "'": '&#x27;',
            '`': '&#x60;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;'
        }[match];
    });
}
