/* LifeTop - todo list */
import { userConfig } from "./config.js?v=8.0";
import { save } from "./storage.js?v=8.0";

let todoFilter = 'all';
let deletedTodo = null;

export function clearTodoUndo() {
    deletedTodo = null;
    document.getElementById('todo-undo').hidden = true;
}

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
    const clearCompletedBtn = document.getElementById('todo-clear-completed-btn');
    if (clearCompletedBtn) {
        clearCompletedBtn.hidden = completed === 0;
    }
    document.querySelectorAll('.todo-filters button[data-filter]').forEach(button => {
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
        const priorityClass = t.priority ? 'is-priority' : '';
        return `
            <li class="todo-item ${completedClass} ${priorityClass}" id="todo-item-${t.id}">
                <label class="todo-item-left">
                    <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo(${t.id})">
                    <span class="todo-text">${escapeHtml(t.text)}</span>
                </label>
                <div class="todo-item-actions">
                    <button type="button" class="todo-priority-btn ${t.priority ? 'active' : ''}" aria-pressed="${Boolean(t.priority)}" aria-label="${escapeHtml(t.text)}を優先マーク" title="優先マーク" onclick="toggleTodoPriority(${t.id})">
                        <span class="material-symbols-outlined" style="font-size: 17px">${t.priority ? 'star' : 'star_outline'}</span>
                    </button>
                    <button type="button" class="todo-delete" aria-label="${escapeHtml(t.text)}を削除" onclick="deleteTodo(${t.id})">
                        <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

export function addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;

    // Undo retains deleted tasks, so reserve their IDs until they can no longer
    // be restored. Reduce also avoids argument limits for large task lists.
    const pendingTodos = deletedTodo?.batch?.map(entry => entry.todo)
        || (deletedTodo?.todo ? [deletedTodo.todo] : []);
    const nextId = [...(userConfig.todoList || []), ...pendingTodos]
        .reduce((next, todo) => Math.max(next, todo.id + 1), Date.now());
    const newTodo = {
        id: nextId,
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

export function toggleTodoPriority(id) {
    const todo = userConfig.todoList?.find(t => t.id === id);
    if (!todo) return;
    if (todo.priority) {
        delete todo.priority;
    } else {
        todo.priority = true;
    }
    save();
    renderTodoList();
}

export function clearCompletedTodos() {
    const todos = userConfig.todoList || [];
    const completedItems = todos
        .map((todo, index) => ({ todo, index }))
        .filter(entry => entry.todo.completed);
    if (completedItems.length === 0) return;

    deletedTodo = { batch: completedItems };
    userConfig.todoList = todos.filter(t => !t.completed);
    save();
    renderTodoList();
    const undoEl = document.getElementById('todo-undo');
    if (undoEl) undoEl.hidden = false;
    document.querySelector('#todo-undo button')?.focus();
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
    deletedTodo = null;
    document.getElementById('todo-undo').hidden = true;
    save();
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
