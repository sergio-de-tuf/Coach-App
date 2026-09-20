import { 
    getStudents, 
    searchStudents, 
    addStudent, 
    updateStudent, 
    deleteStudent, 
    getStudentById 
} from './database.js';

// ===== СОСТОЯНИЕ =====
let allStudents = [];
let filteredStudents = [];
let isEditing = false;

// ===== DOM ЭЛЕМЕНТЫ =====
const studentsList = document.getElementById('studentsList');
const searchInput = document.getElementById('searchInput');
const studentCount = document.getElementById('studentCount');
const addStudentBtn = document.getElementById('addStudentBtn');

// Модальное окно
const modal = document.getElementById('studentModal');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const studentForm = document.getElementById('studentForm');
const studentId = document.getElementById('studentId');
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const phone = document.getElementById('phone');
const email = document.getElementById('email');
const note = document.getElementById('note');
const saveBtnText = document.getElementById('saveBtnText');

// ===== ИНИЦИАЛИЗАЦИЯ =====

async function initStudents() {
    try {
        await loadStudents();
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Не удалось загрузить список учеников');
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====

async function loadStudents(searchTerm = '') {
    try {
        let students;
        if (searchTerm.trim()) {
            students = await searchStudents(searchTerm.trim());
        } else {
            students = await getStudents();
        }
        
        allStudents = students;
        filteredStudents = students;
        renderStudents(students);
        updateCount(students.length);
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        showError('Не удалось загрузить список учеников');
    }
}

// ===== ОТРИСОВКА =====

function renderStudents(students) {
    if (!students || students.length === 0) {
        studentsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p class="empty-text">Нет учеников</p>
                <p class="empty-subtext">Нажмите "Добавить ученика", чтобы начать</p>
            </div>
        `;
        return;
    }
    
    studentsList.innerHTML = students.map(student => createStudentCard(student)).join('');
}

function createStudentCard(student) {
    const fullName = `${student.firstName} ${student.lastName}`;
    const phoneFormatted = formatPhone(student.phone);
    
    return `
        <div class="student-card" data-id="${student.id}">
            <div class="student-card-header">
                <div class="student-name">
                    ${student.firstName} <span class="lastname">${student.lastName}</span>
                </div>
                <div class="student-actions">
                    <button class="btn btn-sm edit-btn" data-id="${student.id}" aria-label="Редактировать">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${student.id}" aria-label="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="student-info">
                <div class="student-info-item">
                    <span class="info-icon">📱</span>
                    <span class="info-value">${phoneFormatted}</span>
                </div>
                ${student.email ? `
                    <div class="student-info-item">
                        <span class="info-icon">✉️</span>
                        <span class="info-value">${student.email}</span>
                    </div>
                ` : ''}
            </div>
            
            ${student.note ? `
                <div class="student-note">
                    ${student.note}
                </div>
            ` : ''}
        </div>
    `;
}

function updateCount(count) {
    const word = getWordForm(count, 'ученик', 'ученика', 'учеников');
    studentCount.textContent = `${count} ${word}`;
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

function formatPhone(phone) {
    // Простое форматирование: +7 (999) 123-45-67
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
    }
    return phone;
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

function setupEventListeners() {
    // Поиск
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadStudents(e.target.value);
        }, 300);
    });
    
    // Добавление ученика
    addStudentBtn.addEventListener('click', openAddModal);
    
    // Закрытие модалки
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Отправка формы
    studentForm.addEventListener('submit', handleFormSubmit);
    
    // Делегирование событий для кнопок в карточках
    studentsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            openEditModal(id);
            return;
        }
        
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            confirmDelete(id);
            return;
        }
    });
    
    // Закрытие по Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ===== ОТКРЫТИЕ МОДАЛКИ =====

function openAddModal() {
    isEditing = false;
    modalTitle.textContent = 'Добавить ученика';
    saveBtnText.textContent = 'Сохранить';
    studentId.value = '';
    studentForm.reset();
    modal.classList.add('open');
    setTimeout(() => firstName.focus(), 100);
}

async function openEditModal(id) {
    try {
        const student = await getStudentById(id);
        if (!student) {
            showError('Ученик не найден');
            return;
        }
        
        isEditing = true;
        modalTitle.textContent = 'Редактировать ученика';
        saveBtnText.textContent = 'Обновить';
        studentId.value = id;
        firstName.value = student.firstName || '';
        lastName.value = student.lastName || '';
        phone.value = student.phone || '';
        email.value = student.email || '';
        note.value = student.note || '';
        modal.classList.add('open');
        setTimeout(() => firstName.focus(), 100);
    } catch (error) {
        console.error('Ошибка загрузки ученика:', error);
        showError('Не удалось загрузить данные ученика');
    }
}

// ===== ЗАКРЫТИЕ МОДАЛКИ =====

function closeModal() {
    modal.classList.remove('open');
    studentForm.reset();
    studentId.value = '';
    isEditing = false;
}

// ===== ОБРАБОТКА ФОРМЫ =====

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Валидация
    const fName = firstName.value.trim();
    const lName = lastName.value.trim();
    const phoneVal = phone.value.trim();
    
    if (!fName) {
        showError('Введите имя');
        firstName.focus();
        return;
    }
    if (!lName) {
        showError('Введите фамилию');
        lastName.focus();
        return;
    }
    if (!phoneVal) {
        showError('Введите телефон');
        phone.focus();
        return;
    }
    
    // Подготовка данных
    const studentData = {
        firstName: fName,
        lastName: lName,
        phone: phoneVal,
        email: email.value.trim() || null,
        note: note.value.trim() || null
    };
    
    try {
        if (isEditing) {
            const id = parseInt(studentId.value);
            await updateStudent(id, studentData);
            showSuccess('Ученик обновлён!');
        } else {
            await addStudent(studentData);
            showSuccess('Ученик добавлен!');
        }
        
        closeModal();
        await loadStudents(searchInput.value);
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError('Не удалось сохранить данные');
    }
}

// ===== УДАЛЕНИЕ =====

function confirmDelete(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;
    
    const fullName = `${student.firstName} ${student.lastName}`;
    
    if (confirm(`Вы уверены, что хотите удалить ученика "${fullName}"?`)) {
        deleteStudentHandler(id);
    }
}

async function deleteStudentHandler(id) {
    try {
        await deleteStudent(id);
        showSuccess('Ученик удалён');
        await loadStudents(searchInput.value);
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showError('Не удалось удалить ученика');
    }
}

// ===== УВЕДОМЛЕНИЯ =====

function showError(message) {
    // Простое уведомление через alert (можно заменить на toast)
    alert('❌ ' + message);
}

function showSuccess(message) {
    // Простое уведомление через alert (можно заменить на toast)
    alert('✅ ' + message);
}

// ===== ЭКСПОРТ =====

export { initStudents };