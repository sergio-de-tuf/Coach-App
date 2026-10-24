/**
 * Календарь тренировок для главной страницы
 */

import { getTrainings } from './database.js';

// ===== СОСТОЯНИЕ =====
let currentDate = new Date();
let allTrainings = [];
let selectedDate = null;

// ===== DOM ЭЛЕМЕНТЫ =====
const calendarTitle = document.getElementById('calendarTitle');
const calendarGrid = document.getElementById('calendarGrid');
const calendarPrev = document.getElementById('calendarPrev');
const calendarNext = document.getElementById('calendarNext');
const calendarDayInfo = document.getElementById('calendarDayInfo');

// ===== МЕСЯЦЫ =====
const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// ===== ЗАГРУЗКА ТРЕНИРОВОК =====
async function loadTrainingsForCalendar() {
    try {
        allTrainings = await getTrainings();
    } catch (e) {
        console.error('Ошибка загрузки тренировок для календаря:', e);
        allTrainings = [];
    }
}

// ===== ФОРМАТИРОВАНИЕ ДАТЫ =====
function formatDateKey(date) {
    // YYYY-MM-DD
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ===== ОТРИСОВКА КАЛЕНДАРЯ =====
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Заголовок
    calendarTitle.textContent = `${MONTHS[month]} ${year}`;

    // Первый день месяца (0 = воскресенье, 1 = понедельник, ...)
    const firstDay = new Date(year, month, 1);
    // Приводим к понедельнику: 0=Пн, 6=Вс
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    // Последний день месяца
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Сегодня
    const today = new Date();
    const todayKey = formatDateKey(today);

    // Группируем тренировки по дате
    const trainingsByDate = {};
    allTrainings.forEach(t => {
        if (!trainingsByDate[t.date]) trainingsByDate[t.date] = [];
        trainingsByDate[t.date].push(t);
    });

    // Строим сетку
    let html = '';

    // Пустые ячейки в начале
    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateKey = formatDateKey(dateObj);
        const trainings = trainingsByDate[dateKey] || [];
        const isToday = dateKey === todayKey;
        const isSelected = dateKey === selectedDate;

        // До 3 точек
        const dotsCount = Math.min(trainings.length, 3);
        let dotsHtml = '';
        if (dotsCount > 0) {
            dotsHtml = '<div class="calendar-dots">';
            for (let i = 0; i < dotsCount; i++) {
                dotsHtml += '<span class="calendar-dot"></span>';
            }
            dotsHtml += '</div>';
        }

        const classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');

        html += `
            <div class="${classes.join(' ')}" data-date="${dateKey}" data-day="${day}">
                <span>${day}</span>
                ${dotsHtml}
            </div>
        `;
    }

    // Добиваем до полной недели (до 42 ячеек = 6 недель)
    const totalCells = startWeekday + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
        for (let i = 0; i < 7 - remainder; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
    }

    calendarGrid.innerHTML = html;

    // Вешаем обработчики на дни
    calendarGrid.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
        el.addEventListener('click', () => {
            const dateKey = el.dataset.date;
            selectDate(dateKey);
        });
    });
}

// ===== ВЫБОР ДНЯ =====
function selectDate(dateKey) {
    selectedDate = dateKey;
    renderCalendar();

    // Показываем тренировки этого дня
    const trainings = allTrainings.filter(t => t.date === dateKey);

    if (trainings.length === 0) {
        calendarDayInfo.innerHTML = `
            <div class="calendar-day-info-title">
                ${formatDayTitle(dateKey)} — нет тренировок
            </div>
        `;
        return;
    }

    const sorted = [...trainings].sort((a, b) => a.time.localeCompare(b.time));

    const trainingsHtml = sorted.map(t => {
    const isGroup = t.trainingType === 'group';
    const displayName = isGroup
        ? (t.groupName || 'Группа')
        : (t.studentFirstName
            ? `${t.studentFirstName} ${t.studentLastName}`
            : 'Ученик не найден');
    
    return `
        <div class="calendar-day-training">
            <span class="training-time">${t.time}</span>
            <span class="training-student">${isGroup ? '👥' : '👤'} ${displayName}</span>
            <span class="training-place">${t.place}</span>
        </div>
    `;
}).join('');

    calendarDayInfo.innerHTML = `
        <div class="calendar-day-info-title">
            ${formatDayTitle(dateKey)} — ${trainings.length} ${getWordForm(trainings.length, 'тренировка', 'тренировки', 'тренировок')}
        </div>
        ${trainingsHtml}
    `;
}

// ===== НАЗВАНИЕ ДНЯ =====
function formatDayTitle(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekdayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    return `${d} ${MONTHS[m - 1]}, ${weekdayNames[dateObj.getDay()]}`;
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

// ===== НАВИГАЦИЯ =====
function goToPrevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    selectedDate = null;
    calendarDayInfo.innerHTML = '';
    renderCalendar();
}

function goToNextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    selectedDate = null;
    calendarDayInfo.innerHTML = '';
    renderCalendar();
}

// ===== ОБНОВЛЕНИЕ (вызывается при переключении на главную) =====
async function refreshCalendar() {
    await loadTrainingsForCalendar();
    renderCalendar();
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initCalendar() {
    if (!calendarGrid) return;

    // Автоматически выбираем сегодня
    selectedDate = formatDateKey(new Date());

    await loadTrainingsForCalendar();
    renderCalendar();
    selectDate(selectedDate);

    // Кнопки навигации
    calendarPrev.addEventListener('click', goToPrevMonth);
    calendarNext.addEventListener('click', goToNextMonth);

    console.log('✅ Календарь загружен');
}

// ===== ЭКСПОРТ =====
export { initCalendar, refreshCalendar };