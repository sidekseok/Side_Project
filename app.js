// 투두리스트 앱
(function () {
    'use strict';

    const STORAGE_KEY = 'todos_v1';

    // DOM 요소
    const form = document.getElementById('todoForm');
    const input = document.getElementById('todoInput');
    const todoList = document.getElementById('todoList');
    const emptyState = document.getElementById('emptyState');
    const statsEl = document.getElementById('stats');
    const dateDisplay = document.getElementById('dateDisplay');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clearCompleted');

    // 상태
    let todos = loadTodos();
    let currentFilter = 'all';

    // 오늘 날짜 표시
    function displayDate() {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const now = new Date();
        const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
        dateDisplay.textContent = dateStr;
    }

    // 저장/로드
    function loadTodos() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load todos:', e);
            return [];
        }
    }

    function saveTodos() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
        } catch (e) {
            console.error('Failed to save todos:', e);
        }
    }

    // ID 생성
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // 할 일 추가
    function addTodo(text) {
        const trimmed = text.trim();
        if (!trimmed) return;

        todos.unshift({
            id: generateId(),
            text: trimmed,
            completed: false,
            createdAt: Date.now()
        });

        saveTodos();
        render();
    }

    // 완료 토글
    function toggleTodo(id) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            saveTodos();
            render();
        }
    }

    // 삭제
    function deleteTodo(id) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        render();
    }

    // 수정
    function updateTodo(id, newText) {
        const trimmed = newText.trim();
        const todo = todos.find(t => t.id === id);
        if (todo && trimmed) {
            todo.text = trimmed;
            saveTodos();
        }
        render();
    }

    // 완료된 항목 전체 삭제
    function clearCompleted() {
        const completedCount = todos.filter(t => t.completed).length;
        if (completedCount === 0) return;
        if (!confirm(`완료된 ${completedCount}개의 항목을 삭제하시겠습니까?`)) return;

        todos = todos.filter(t => !t.completed);
        saveTodos();
        render();
    }

    // 필터링
    function getFilteredTodos() {
        switch (currentFilter) {
            case 'active':
                return todos.filter(t => !t.completed);
            case 'completed':
                return todos.filter(t => t.completed);
            default:
                return todos;
        }
    }

    // HTML 이스케이프
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 렌더링
    function render() {
        const filtered = getFilteredTodos();

        // 통계
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        statsEl.textContent = `총 ${total}개 · 완료 ${completed}개 · 진행중 ${active}개`;

        // 비어있을 때
        if (filtered.length === 0) {
            todoList.innerHTML = '';
            emptyState.classList.add('show');

            // 필터별 메시지
            const emptyP = emptyState.querySelector('p');
            const emptySpan = emptyState.querySelector('span');
            if (total === 0) {
                emptyP.textContent = '할 일이 없습니다';
                emptySpan.textContent = '새로운 할 일을 추가해보세요!';
            } else if (currentFilter === 'active') {
                emptyP.textContent = '진행중인 일이 없습니다';
                emptySpan.textContent = '모든 일을 완료했어요! 🎉';
            } else if (currentFilter === 'completed') {
                emptyP.textContent = '완료한 일이 없습니다';
                emptySpan.textContent = '할 일을 완료해보세요!';
            }
            return;
        }

        emptyState.classList.remove('show');

        todoList.innerHTML = filtered.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="checkbox ${todo.completed ? 'checked' : ''}" data-action="toggle"></div>
                <span class="todo-text" data-action="edit">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" data-action="delete" title="삭제">✕</button>
            </li>
        `).join('');
    }

    // 인라인 편집 시작
    function startEdit(textEl, id) {
        const todo = todos.find(t => t.id === id);
        if (!todo || todo.completed) return;

        const currentText = todo.text;
        textEl.classList.add('editing');
        textEl.contentEditable = 'true';
        textEl.focus();

        // 커서를 끝으로
        const range = document.createRange();
        range.selectNodeContents(textEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        let finished = false;
        const finish = (save) => {
            if (finished) return;
            finished = true;
            textEl.classList.remove('editing');
            textEl.contentEditable = 'false';
            if (save) {
                updateTodo(id, textEl.textContent);
            } else {
                textEl.textContent = currentText;
            }
        };

        textEl.addEventListener('blur', () => finish(true), { once: true });
        textEl.addEventListener('keydown', function handler(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                textEl.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                textEl.removeEventListener('keydown', handler);
                finish(false);
            }
        });
    }

    // 이벤트 리스너
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addTodo(input.value);
        input.value = '';
        input.focus();
    });

    todoList.addEventListener('click', (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;

        const id = item.dataset.id;
        const action = e.target.dataset.action;

        if (action === 'toggle') {
            toggleTodo(id);
        } else if (action === 'delete') {
            deleteTodo(id);
        } else if (action === 'edit') {
            startEdit(e.target, id);
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            render();
        });
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    // 초기화
    displayDate();
    render();
    input.focus();
})();
