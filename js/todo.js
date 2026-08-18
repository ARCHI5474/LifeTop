/* LifeTop - todo list */
import { userConfig } from "./config.js";
import { save } from "./storage.js";

export function switchUtilityTab(tabName) {
    document.querySelectorAll('.utility-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.utility-card .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'todo') {
        document.querySelector(".utility-tabs button:nth-child(1)").classList.add('active');
        document.getElementById('todo-tab-content').classList.add('active');
    } else {
        document.querySelector(".utility-tabs button:nth-child(2)").classList.add('active');
        document.getElementById('memo-tab-content').classList.add('active');
    }
}

// ToDo操作
export function renderTodoList() {
    const list = document.getElementById('todo-list');
    if (!userConfig.todoList || userConfig.todoList.length === 0) {
        list.innerHTML = `<li style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px 0;">タスクはありません。</li>`;
        return;
    }
    
    list.innerHTML = userConfig.todoList.map(t => {
        const completedClass = t.completed ? 'completed' : '';
        return `
            <li class="todo-item ${completedClass}" id="todo-item-${t.id}">
                <div class="todo-item-left" onclick="toggleTodo(${t.id})">
                    <div class="todo-checkbox">
                        <span class="material-symbols-outlined">check</span>
                    </div>
                    <span class="todo-text">${escapeHtml(t.text)}</span>
                </div>
                <button class="todo-delete" onclick="deleteTodo(${t.id})">
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
        id: Date.now(),
        text: text,
        completed: false
    };
    
    if (!userConfig.todoList) userConfig.todoList = [];
    userConfig.todoList.push(newTodo);
    save();
    renderTodoList();
    input.value = "";
}

export function toggleTodo(id) {
    const todo = userConfig.todoList.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        save();
        renderTodoList();
    }
}

export function deleteTodo(id) {
    userConfig.todoList = userConfig.todoList.filter(t => t.id !== id);
    save();
    renderTodoList();
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
