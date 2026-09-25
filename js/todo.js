/* LifeTop - todo list */
import { userConfig } from "./config.js?v=4.0.1";
import { save } from "./storage.js?v=4.0.1";

let todoFilter = 'all';
let deletedTodo = null;

export function setTodoFilter(filter) {
    if (!['all', 'active', 'completed'].includes(filter)) return;
    todoFilter = filter;
    renderTodoList();
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
    const completed = todos.filter(todo => todo.completed).length;
    document.getElementById('todo-summary').textContent = todos.length ? `残り ${todos.length - completed} 件` : '小さな一歩から、はじめよう';
    document.getElementById('todo-progress-label').textContent = `${completed} / ${todos.length} 完了`;
    const progress = document.getElementById('todo-progress');
    progress.max = todos.length || 1;
    progress.value = completed;
    document.querySelectorAll('.todo-filters button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === todoFilter));
    });
    const visibleTodos = todos.filter(todo => todoFilter === 'all' || todo.completed === (todoFilter === 'completed'));
    if (visibleTodos.length === 0) {
        const message = todoFilter === 'completed' ? '完了したタスクはまだありません。'
            : todoFilter === 'active' && todos.length ? 'すべてのタスクが完了しました！' : 'タスクを追加して、今日をはじめましょう。';
        list.innerHTML = `<li class="todo-empty"><span class="material-symbols-outlined" aria-hidden="true">task_alt</span>${message}</li>`;
        return;
    }

    list.innerHTML = visibleTodos.map(t => {
        const completedClass = t.completed ? 'completed' : '';
        return `
            <li class="todo-item ${completedClass}" id="todo-item-${t.id}">
                <label class="todo-item-left">
                    <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${t.id})">
                    <span class="todo-text">${escapeHtml(t.text)}</span>
                </label>
                <button type="button" class="todo-delete" aria-label="${escapeHtml(t.text)}を削除" onclick="deleteTodo(${t.id})">
                    <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                </button>
            </li>
        `;
    }).join('');
}

export function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    const newTodo = {
        id: Math.max(Date.now(), ...(userConfig.todoList || []).map(todo => todo.id + 1)),
        text: text,
        completed: false
    };

    if (!userConfig.todoList) userConfig.todoList = [];
    userConfig.todoList.push(newTodo);
    if (todoFilter === 'completed') todoFilter = 'active';
    save();
    renderTodoList();
    input.value = "";
    input.focus();
}

export function toggleTodo(id) {
    const todo = userConfig.todoList.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        save();
        renderTodoList();
        (document.querySelector(`#todo-item-${id} input`) || document.getElementById('todo-input')).focus();
    }
}

export function deleteTodo(id) {
    const index = userConfig.todoList.findIndex(todo => todo.id === id);
    if (index < 0) return;
    deletedTodo = { todo: userConfig.todoList[index], index };
    userConfig.todoList = userConfig.todoList.filter(t => t.id !== id);
    save();
    renderTodoList();
    document.getElementById('todo-undo').hidden = false;
    document.querySelector('#todo-undo button')?.focus();
}

export function undoDeleteTodo() {
    if (!deletedTodo) return;
    userConfig.todoList.splice(deletedTodo.index, 0, deletedTodo.todo);
    const id = deletedTodo.todo.id;
    deletedTodo = null;
    document.getElementById('todo-undo').hidden = true;
    save();
    renderTodoList();
    (document.querySelector(`#todo-item-${id} input`) || document.getElementById('todo-input')).focus();
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
