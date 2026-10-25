/**
 * Модуль управления расписанием тренировок (UI)
 */

import {
    getTrainings,
    getTrainingById,
    addTraining,
    updateTraining,
    deleteTraining,
    getStudents
} from './database.js';

// ===== СОСТОЯНИЕ =====
let allTrainings = [];
let currentFilter = 'all';
let searchTerm = '';
let isEditing = false;

// ===== DOM ЭЛЕМЕНТЫ =====
const trainingsList = document.getElementById('trainingsList');
const searchTrainingInput = document.getElementById('searchTrainingInput');
const trainingCount = document.getElementById('trainingCount');
const addTrainingBtn = document.getElementById('addTrainingBtn');
const filterButtons = document.querySelectorAll('.filter-btn');

// Модальное окно
const trainingModal = document.getElementById('trainingModal');
const trainingModalTitle = document.getElementById('trainingModalTitle');
const closeTrainingModal = document.getElementById('closeTrainingModal');
const cancelTrainingBtn = document.getElementById('cancelTrainingBtn');
const trainingForm = document.getElementById('trainingForm');
const trainingId = document.getElementById('trainingId');
const trainingStudent = document.getElementById('trainingStudent');
const trainingDate = document.getElementById('trainingDate');
const trainingTime = document.getElementById('trainingTime');
const trainingPlace = document.getElementById('trainingPlace');
const trainingDuration = document.getElementById('trainingDuration');
const trainingNote = document.getElementById('trainingNote');
const saveTrainingBtnText = document.getElementById('saveTrainingBtnText');

// Новые элементы для типа тренировки
const trainingTypeRadios = document.querySelectorAll('input[name="trainingType"]');
const studentSelectGroup = document.getElementById('studentSelectGroup');
const groupNameGroup = document.getElementById('groupNameGroup');
const trainingGroupName = document.getElementById('trainingGroupName');

// ===== ИНИЦИАЛИЗАЦИЯ =====

async function initSchedule() {
    try {
        await loadStudentsForSelect();
        await loadTrainings();
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации расписания:', error);
        showError('Не удалось загрузить расписание');
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====

async function loadStudentsForSelect() {
    try {
        const students = await getStudents();
        trainingStudent.innerHTML = '<option value="">Выберите ученика</option>';
        students.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.firstName} ${s.lastName}`;
            trainingStudent.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки учеников для селекта:', error);
    }
}

async function loadTrainings() {
    try {
        let trainings = await getTrainings();

        // Поиск
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            trainings = trainings.filter(t => {
                const studentName = `${t.studentFirstName || ''} ${t.studentLastName || ''}`.toLowerCase();
                const groupName = (t.groupName || '').toLowerCase();
                return t.place.toLowerCase().includes(term)
                    || studentName.includes(term)
                    || groupName.includes(term);
            });
        }

        // Фильтр
        if (currentFilter !== 'all') {
            const today = new Date().toISOString().split('T')[0];
            trainings = trainings.filter(t => {
                if (currentFilter === 'upcoming') return t.date >= today;
                if (currentFilter === 'past') return t.date < today;
                return true;
            });
        }

        allTrainings = trainings;
        renderTrainings(trainings);
        updateTrainingCount(trainings.length);
    } catch (error) {
        console.error('Ошибка загрузки тренировок:', error);
        showError('Не удалось загрузить расписание');
    }
}

// ===== ОТРИСОВКА =====

function renderTrainings(trainings) {
    if (!trainings || trainings.length === 0) {
        trainingsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📅</span>
                <p class="empty-text">Нет тренировок</p>
                <p class="empty-subtext">Нажмите "Добавить тренировку", чтобы начать</p>
            </div>
        `;
        return;
    }

    trainingsList.innerHTML = trainings.map(t => createTrainingCard(t)).join('');
}

function createTrainingCard(training) {
    const date = new Date(training.date);
    const day = date.getDate();
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const month = months[date.getMonth()];

    const today = new Date().toISOString().split('T')[0];
    const isToday = training.date === today;
    const isPast = training.date < today;

    // Определяем, что показывать: ученика или группу
    const isGroup = training.trainingType === 'group';
    const displayName = isGroup
        ? training.groupName || 'Группа'
        : (training.studentFirstName
            ? `${training.studentFirstName} ${training.studentLastName}`
            : 'Ученик не найден');

    const groupBadge = isGroup ? '<span class="training-group-badge">Группа</span>' : '';

    return `
        <div class="training-card ${isPast ? 'past' : ''}" data-id="${training.id}">
            <div class="training-date">
                <span class="training-day">${day}</span>
                <span class="training-month">${month}</span>
            </div>
            
            <div class="training-body">
                <div class="training-header">
                    <div>
                        <div class="training-student">
                            ${displayName}
                            ${groupBadge}
                            ${isToday ? '<span class="training-today">Сегодня</span>' : ''}
                        </div>
                    </div>
                    <div class="training-actions">
                        <button class="btn btn-sm edit-training-btn" data-id="${training.id}" aria-label="Редактировать">✏️</button>
                        <button class="btn btn-sm btn-danger delete-training-btn" data-id="${training.id}" aria-label="Удалить">🗑️</button>
                    </div>
                </div>
                
                <div class="training-time">
                    <span>${training.time}</span>
                </div>
                
                <div class="training-place">
                    <span>${training.place}</span>
                </div>
                
                ${training.duration ? `
                    <div class="training-duration">⏱ ${training.duration} мин</div>
                ` : ''}
                
                ${training.note ? `
                    <div class="student-note">${training.note}</div>
                ` : ''}
            </div>
        </div>
    `;
}

function updateTrainingCount(count) {
    const word = getWordForm(count, 'тренировка', 'тренировки', 'тренировок');
    trainingCount.textContent = `${count} ${word}`;
}

function getWordForm(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТИПА ТРЕНИРОВКИ =====

function toggleTrainingType(type) {
    if (type === 'group') {
        studentSelectGroup.style.display = 'none';
        groupNameGroup.style.display = 'block';
        trainingStudent.removeAttribute('required');
        trainingGroupName.setAttribute('required', 'required');
        setTimeout(() => trainingGroupName.focus(), 100);
    } else {
        studentSelectGroup.style.display = 'block';
        groupNameGroup.style.display = 'none';
        trainingGroupName.removeAttribute('required');
        trainingStudent.setAttribute('required', 'required');
    }
}

// ===== ОБРАБОТЧИКИ =====

function setupEventListeners() {
    // Поиск
    let searchTimeout;
    searchTrainingInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value;
            loadTrainings();
        }, 300);
    });

    // Фильтры
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadTrainings();
        });
    });

    // Добавление
    addTrainingBtn.addEventListener('click', openAddTrainingModal);

    // Закрытие модалки
    closeTrainingModal.addEventListener('click', closeTrainingModalFunc);
    cancelTrainingBtn.addEventListener('click', closeTrainingModalFunc);
    trainingModal.addEventListener('click', (e) => {
        if (e.target === trainingModal) closeTrainingModalFunc();
    });

    // Отправка формы
    trainingForm.addEventListener('submit', handleTrainingSubmit);

    // Переключение типа тренировки
    trainingTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleTrainingType(e.target.value);
        });
    });

    // Делегирование для кнопок в карточках
    trainingsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-training-btn');
        if (editBtn) {
            openEditTrainingModal(parseInt(editBtn.dataset.id));
            return;
        }

        const deleteBtn = e.target.closest('.delete-training-btn');
        if (deleteBtn) {
            confirmDeleteTraining(parseInt(deleteBtn.dataset.id));
            return;
        }
    });

    // Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTrainingModalFunc();
    });
}

// ===== МОДАЛКА =====

function openAddTrainingModal() {
    isEditing = false;
    trainingModalTitle.textContent = 'Добавить тренировку';
    saveTrainingBtnText.textContent = 'Сохранить';
    trainingId.value = '';
    trainingForm.reset();

    // Сброс на "Ученик"
    trainingTypeRadios.forEach(r => r.checked = r.value === 'student');
    toggleTrainingType('student');

    // Устанавливаем сегодняшнюю дату по умолчанию
    trainingDate.value = new Date().toISOString().split('T')[0];
    trainingModal.classList.add('open');
    setTimeout(() => trainingStudent.focus(), 100);
}

async function openEditTrainingModal(id) {
    try {
        const training = await getTrainingById(id);
        if (!training) {
            showError('Тренировка не найдена');
            return;
        }

        isEditing = true;
        trainingModalTitle.textContent = 'Редактировать тренировку';
        saveTrainingBtnText.textContent = 'Обновить';
        trainingId.value = id;

        // Устанавливаем тип
        const type = training.trainingType || 'student';
        trainingTypeRadios.forEach(r => r.checked = r.value === type);
        toggleTrainingType(type);

        // Заполняем поля
        if (type === 'student') {
            trainingStudent.value = training.studentId || '';
        } else {
            trainingGroupName.value = training.groupName || '';
        }

        trainingDate.value = training.date;
        trainingTime.value = training.time;
        trainingPlace.value = training.place || '';
        trainingDuration.value = training.duration || '';
        trainingNote.value = training.note || '';
        trainingModal.classList.add('open');
    } catch (error) {
        console.error('Ошибка загрузки тренировки:', error);
        showError('Не удалось загрузить тренировку');
    }
}

function closeTrainingModalFunc() {
    trainingModal.classList.remove('open');
    trainingForm.reset();
    trainingId.value = '';
    isEditing = false;
}

// ===== СОХРАНЕНИЕ =====

async function handleTrainingSubmit(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="trainingType"]:checked')?.value || 'student';
    const date = trainingDate.value;
    const time = trainingTime.value;
    const place = trainingPlace.value.trim();

    // Валидация
    if (type === 'student') {
        const studentId = trainingStudent.value;
        if (!studentId) {
            showError('Выберите ученика');
            trainingStudent.focus();
            return;
        }
    } else {
        const groupName = trainingGroupName.value.trim();
        if (!groupName) {
            showError('Введите название группы');
            trainingGroupName.focus();
            return;
        }
    }

    if (!date) {
        showError('Выберите дату');
        trainingDate.focus();
        return;
    }
    if (!time) {
        showError('Выберите время');
        trainingTime.focus();
        return;
    }
    if (!place) {
        showError('Введите место');
        trainingPlace.focus();
        return;
    }

    // Подготовка данных
    const trainingData = {
        trainingType: type,
        studentId: type === 'student' ? parseInt(trainingStudent.value) : null,
        groupName: type === 'group' ? trainingGroupName.value.trim() : null,
        date,
        time,
        place,
        duration: trainingDuration.value ? parseInt(trainingDuration.value) : null,
        note: trainingNote.value.trim() || null
    };

    try {
        if (isEditing) {
            await updateTraining(parseInt(trainingId.value), trainingData);
            showSuccess('Тренировка обновлена!');
        } else {
            await addTraining(trainingData);
            showSuccess('Тренировка добавлена!');
        }

        closeTrainingModalFunc();
        await loadTrainings();
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('Не удалось сохранить тренировку');
    }
}

// ===== УДАЛЕНИЕ =====

function confirmDeleteTraining(id) {
    const training = allTrainings.find(t => t.id === id);
    if (!training) return;

    const isGroup = training.trainingType === 'group';
    const displayName = isGroup
        ? training.groupName || 'группа'
        : (training.studentFirstName
            ? `${training.studentFirstName} ${training.studentLastName}`
            : 'ученик');

    if (confirm(`Удалить тренировку "${displayName}" от ${training.date}?`)) {
        deleteTrainingHandler(id);
    }
}

async function deleteTrainingHandler(id) {
    try {
        await deleteTraining(id);
        showSuccess('Тренировка удалена');
        await loadTrainings();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showError('Не удалось удалить тренировку');
    }
}

// ===== УВЕДОМЛЕНИЯ =====

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// ===== ЭКСПОРТ =====
export { initSchedule };