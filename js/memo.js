/* LifeTop - Rich Text Memo with formatting toolbar, auto-save, copy & export */
import { userConfig } from "./config.js?v=8.0";
import { save } from "./storage.js?v=8.0";

const ALLOWED_TAGS = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'MARK',
    'SPAN', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'P', 'DIV', 'BR', 'CODE', 'FONT'
]);

const HIGHLIGHT_COLORS = [
    { id: 'yellow', label: 'イエロー', bg: 'rgba(250, 204, 21, 0.38)' },
    { id: 'green', label: 'グリーン', bg: 'rgba(52, 211, 153, 0.34)' },
    { id: 'blue', label: 'ブルー', bg: 'rgba(56, 189, 248, 0.34)' },
    { id: 'pink', label: 'ピンク', bg: 'rgba(244, 114, 182, 0.34)' }
];

let currentHighlightIdx = 0;
let savedSelectionRange = null;

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#x27;', '"': '&quot;'
    })[ch]);
}

function plainTextToHtml(text) {
    if (!text) return '';
    return String(text)
        .split(/\r?\n/)
        .map(line => line ? `<div>${escapeHtml(line)}</div>` : '<div><br></div>')
        .join('');
}

export function sanitizeMemoHtml(rawHtml) {
    if (!rawHtml || typeof rawHtml !== 'string') return '';
    if (typeof DOMParser === 'undefined') return rawHtml;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return '';

        const cleanNode = (node) => {
            const children = Array.from(node.childNodes || []);
            for (const child of children) {
                if (child.nodeType === 3) continue; // Text node
                if (child.nodeType !== 1) {
                    child.remove();
                    continue;
                }
                const tag = child.tagName.toUpperCase();
                if (!ALLOWED_TAGS.has(tag)) {
                    const text = doc.createTextNode(child.textContent || '');
                    child.replaceWith(text);
                    continue;
                }
                // Strip unsafe attributes, preserve only safe inline style & class
                const attrs = Array.from(child.attributes || []);
                for (const attr of attrs) {
                    const name = attr.name.toLowerCase();
                    if (name === 'style') {
                        const safeRules = [];
                        const styleStr = attr.value || '';
                        const bgMatch = styleStr.match(/background(?:-color)?\s*:\s*([^;]+)/i);
                        if (bgMatch && !/url|expression|javascript/i.test(bgMatch[1])) {
                            safeRules.push(`background-color: ${bgMatch[1].trim()}`);
                        }
                        const colorMatch = styleStr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
                        if (colorMatch && !/url|expression|javascript/i.test(colorMatch[1])) {
                            safeRules.push(`color: ${colorMatch[1].trim()}`);
                        }
                        const weightMatch = styleStr.match(/font-weight\s*:\s*(bold|[5-9]00)/i);
                        if (weightMatch) safeRules.push(`font-weight: ${weightMatch[1]}`);
                        const styleMatch = styleStr.match(/font-style\s*:\s*(italic)/i);
                        if (styleMatch) safeRules.push(`font-style: italic`);
                        const decMatch = styleStr.match(/text-decoration(?:-line)?\s*:\s*([^;]+)/i);
                        if (decMatch && !/url|expression|javascript/i.test(decMatch[1])) {
                            safeRules.push(`text-decoration: ${decMatch[1].trim()}`);
                        }
                        if (safeRules.length > 0) {
                            child.setAttribute('style', safeRules.join('; '));
                        } else {
                            child.removeAttribute('style');
                        }
                    } else if (name === 'class' && child.classList.contains('memo-check-item')) {
                        child.setAttribute('class', 'memo-check-item');
                    } else if (name === 'color' && tag === 'FONT') {
                        // Allow font color attribute from execCommand('foreColor')
                    } else {
                        child.removeAttribute(attr.name);
                    }
                }
                cleanNode(child);
            }
        };

        cleanNode(root);
        return root.innerHTML;
    } catch {
        return '';
    }
}

function saveSelection() {
    if (typeof window === 'undefined' || !window.getSelection) return;
    const editor = document.getElementById('memo-editor');
    if (!editor) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
            savedSelectionRange = range.cloneRange();
        }
    }
}

function restoreSelection() {
    const editor = document.getElementById('memo-editor');
    if (!editor) return;
    editor.focus({ preventScroll: true });
    if (savedSelectionRange && window.getSelection) {
        try {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelectionRange);
        } catch {}
    }
}

export function syncMemoFromConfig() {
    const editor = document.getElementById('memo-editor');
    const textarea = document.getElementById('memo-area');
    const plain = userConfig.memo || '';
    if (textarea) textarea.value = plain;

    if (editor) {
        const html = userConfig.memoHtml
            ? sanitizeMemoHtml(userConfig.memoHtml)
            : plainTextToHtml(plain);
        editor.innerHTML = html;
        updateEditorEmptyState(editor);
    }
    updateMemoStatus();
}

function updateEditorEmptyState(editor) {
    if (!editor) return;
    const text = (editor.innerText || editor.textContent || '').replace(/\u200B/g, '').trim();
    editor.classList?.toggle?.('is-empty', text.length === 0 && !editor.querySelector?.('ul, ol, blockquote, h3, hr'));
}

export function syncMemoToConfig() {
    const editor = document.getElementById('memo-editor');
    const textarea = document.getElementById('memo-area');
    if (editor) {
        const rawText = (editor.innerText || editor.textContent || '').replace(/\r\n/g, '\n').replace(/\n$/, '');
        userConfig.memo = rawText;
        userConfig.memoHtml = sanitizeMemoHtml(editor.innerHTML);
        if (textarea) textarea.value = rawText;
        updateEditorEmptyState(editor);
    } else if (textarea) {
        userConfig.memo = textarea.value;
        userConfig.memoHtml = plainTextToHtml(textarea.value);
    }
    const saved = save();
    updateMemoStatus(saved);
    updateToolbarActiveStates();
}

export function updateMemoStatus(saved) {
    const editor = document.getElementById('memo-editor');
    const textarea = document.getElementById('memo-area');
    const text = editor
        ? (editor.innerText || editor.textContent || '').replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
        : (textarea?.value || '');
    const charCount = Array.from(text.replace(/\n/g, '')).length;
    const lineCount = text ? text.split('\n').length : 0;

    const countEl = document.getElementById('memo-count');
    if (countEl) {
        countEl.textContent = lineCount > 1
            ? `${charCount.toLocaleString('ja-JP')}文字・${lineCount}行`
            : `${charCount.toLocaleString('ja-JP')}文字`;
    }
    const statusEl = document.getElementById('memo-save-status');
    if (statusEl && saved !== undefined) {
        statusEl.textContent = saved ? '保存しました' : '未保存 — 保存設定を確認してください';
    }
}

export function formatMemo(command, value = null) {
    const editor = document.getElementById('memo-editor');
    if (!editor) return;
    restoreSelection();

    switch (command) {
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strikeThrough':
        case 'insertUnorderedList':
        case 'insertOrderedList':
            document.execCommand(command, false, null);
            break;

        case 'heading': {
            const parentTag = getSelectionBlockTag();
            if (parentTag === 'H3') {
                document.execCommand('formatBlock', false, 'DIV');
            } else {
                document.execCommand('formatBlock', false, 'H3');
            }
            break;
        }

        case 'quote': {
            const parentTag = getSelectionBlockTag();
            if (parentTag === 'BLOCKQUOTE') {
                document.execCommand('formatBlock', false, 'DIV');
            } else {
                document.execCommand('formatBlock', false, 'BLOCKQUOTE');
            }
            break;
        }

        case 'highlight': {
            const colorObj = value
                ? (HIGHLIGHT_COLORS.find(c => c.id === value) || HIGHLIGHT_COLORS[0])
                : HIGHLIGHT_COLORS[currentHighlightIdx];
            if (!value) {
                currentHighlightIdx = (currentHighlightIdx + 1) % HIGHLIGHT_COLORS.length;
            }
            const sel = window.getSelection?.();
            if (sel && !sel.isCollapsed) {
                document.execCommand('hiliteColor', false, colorObj.bg);
            } else {
                document.execCommand('insertHTML', false, `<mark style="background-color: ${colorObj.bg}; padding: 0 2px; border-radius: 3px;">強調テキスト</mark>&#8203;`);
            }
            break;
        }

        case 'foreColor': {
            const accentColor = value || getComputedStyle(document.documentElement).getPropertyValue('--p-strong').trim() || '#38bdf8';
            document.execCommand('foreColor', false, accentColor);
            break;
        }

        case 'checklist': {
            document.execCommand('insertHTML', false, '<div>☐ </div>');
            break;
        }

        case 'removeFormat': {
            document.execCommand('removeFormat', false, null);
            const blockTag = getSelectionBlockTag();
            if (blockTag === 'H3' || blockTag === 'BLOCKQUOTE') {
                document.execCommand('formatBlock', false, 'DIV');
            }
            break;
        }

        default:
            break;
    }

    saveSelection();
    syncMemoToConfig();
}

function getSelectionBlockTag() {
    if (!window.getSelection) return '';
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    let node = sel.anchorNode;
    const editor = document.getElementById('memo-editor');
    while (node && node !== editor) {
        if (node.nodeType === 1) {
            const tag = node.tagName.toUpperCase();
            if (['H3', 'H4', 'BLOCKQUOTE', 'DIV', 'P', 'LI'].includes(tag)) {
                return tag;
            }
        }
        node = node.parentNode;
    }
    return '';
}

function updateToolbarActiveStates() {
    if (typeof document.queryCommandState !== 'function') return;
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
    commands.forEach(cmd => {
        const btn = document.querySelector?.(`[data-memo-cmd="${cmd}"]`);
        if (!btn) return;
        try {
            const active = document.queryCommandState(cmd);
            btn.classList?.toggle?.('active', Boolean(active));
            btn.setAttribute?.('aria-pressed', String(Boolean(active)));
        } catch {}
    });

    const blockTag = getSelectionBlockTag();
    const headingBtn = document.querySelector?.('[data-memo-cmd="heading"]');
    if (headingBtn) {
        const isH = blockTag === 'H3';
        headingBtn.classList?.toggle?.('active', isH);
        headingBtn.setAttribute?.('aria-pressed', String(isH));
    }
    const quoteBtn = document.querySelector?.('[data-memo-cmd="quote"]');
    if (quoteBtn) {
        const isQ = blockTag === 'BLOCKQUOTE';
        quoteBtn.classList?.toggle?.('active', isQ);
        quoteBtn.setAttribute?.('aria-pressed', String(isQ));
    }
}

export async function copyMemoContent() {
    const editor = document.getElementById('memo-editor');
    const textarea = document.getElementById('memo-area');
    const text = editor ? (editor.innerText || editor.textContent || '').trim() : (textarea?.value || '').trim();
    const statusEl = document.getElementById('memo-save-status');
    if (!text) {
        if (statusEl) statusEl.textContent = 'コピーする文字がありません';
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        if (statusEl) statusEl.textContent = 'クリップボードにコピーしました！';
    } catch {
        if (textarea) {
            textarea.hidden = false;
            textarea.select();
            document.execCommand('copy');
            textarea.hidden = true;
            if (statusEl) statusEl.textContent = 'クリップボードにコピーしました！';
        }
    }
}

export function initMemoEditor() {
    const editor = document.getElementById('memo-editor');
    const textarea = document.getElementById('memo-area');
    const toolbar = document.getElementById('memo-toolbar');

    syncMemoFromConfig();

    if (toolbar) {
        toolbar.addEventListener('mousedown', (event) => {
            if (event.target?.closest?.('button')) {
                event.preventDefault(); // Keep selection inside contenteditable
            }
        });
    }

    if (editor) {
        editor.addEventListener('input', () => {
            saveSelection();
            syncMemoToConfig();
        });
        editor.addEventListener('keyup', () => {
            saveSelection();
            updateToolbarActiveStates();
        });
        editor.addEventListener('mouseup', () => {
            saveSelection();
            updateToolbarActiveStates();
        });
        editor.addEventListener('touchend', () => {
            saveSelection();
            updateToolbarActiveStates();
        }, { passive: true });

        // Clickable inline ☐ / ☑ toggle inside memo
        editor.addEventListener('click', (event) => {
            const sel = window.getSelection?.();
            if (!sel || !sel.isCollapsed) return;
            const node = sel.anchorNode;
            if (node && node.nodeType === 3) {
                const text = node.textContent || '';
                const offset = sel.anchorOffset;
                if (offset <= 2 && (text.startsWith('☐') || text.startsWith('☑'))) {
                    node.textContent = (text.startsWith('☐') ? '☑' : '☐') + text.slice(1);
                    syncMemoToConfig();
                }
            }
        });

        // Keyboard shortcuts inside editor
        editor.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                const key = event.key.toLowerCase();
                if (key === 'b') {
                    event.preventDefault();
                    formatMemo('bold');
                } else if (key === 'i') {
                    event.preventDefault();
                    formatMemo('italic');
                } else if (key === 'u') {
                    event.preventDefault();
                    formatMemo('underline');
                }
            }
        });
    }

    if (textarea) {
        textarea.addEventListener('input', () => {
            userConfig.memo = textarea.value;
            userConfig.memoHtml = plainTextToHtml(textarea.value);
            if (editor) {
                editor.innerHTML = userConfig.memoHtml;
                updateEditorEmptyState(editor);
            }
            updateMemoStatus(save());
        });
    }
}
