/**
 * Модуль "Инструменты" — секундомер
 */

// ===== СОСТОЯНИЕ =====
let isRunning = false;
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let laps = [];
let lastLapTime = 0;

// ===== DOM ЭЛЕМЕНТЫ =====
const display = document.getElementById('stopwatchDisplay');
const startBtn = document.getElementById('stopwatchStart');
const lapBtn = document.getElementById('stopwatchLap');
const resetBtn = document.getElementById('stopwatchReset');
const lapsContainer = document.getElementById('stopwatchLaps');

// ===== ФОРМАТИРОВАНИЕ ВРЕМЕНИ =====
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

// ===== ОБНОВЛЕНИЕ ДИСПЛЕЯ =====
function updateDisplay() {
    const now = Date.now();
    const currentElapsed = elapsedTime + (isRunning ? now - startTime : 0);
    display.textContent = formatTime(currentElapsed);
}

// ===== СТАРТ / ПАУЗА =====
function toggleStart() {
    if (isRunning) {
        // Пауза
        isRunning = false;
        elapsedTime += Date.now() - startTime;
        clearInterval(timerInterval);
        startBtn.textContent = '▶ Продолжить';
        startBtn.classList.remove('btn-danger');
        startBtn.classList.add('btn-primary');
    } else {
        // Старт
        isRunning = true;
        startTime = Date.now();
        timerInterval = setInterval(updateDisplay, 10);   // обновление каждые 10 мс
        startBtn.textContent = '⏸ Пауза';
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-danger');
    }
    
    // Активируем кнопки
    lapBtn.disabled = !isRunning;
    resetBtn.disabled = false;
}

// ===== КРУГ =====
function addLap() {
    if (!isRunning) return;
    
    const now = Date.now();
    const currentTotal = elapsedTime + (now - startTime);
    const lapTime = currentTotal - lastLapTime;
    lastLapTime = currentTotal;
    
    laps.push({
        number: laps.length + 1,
        total: currentTotal,
        lap: lapTime
    });
    
    renderLaps();
}

// ===== СБРОС =====
function reset() {
    isRunning = false;
    clearInterval(timerInterval);
    elapsedTime = 0;
    lastLapTime = 0;
    laps = [];
    
    display.textContent = '00:00.00';
    startBtn.textContent = '▶ Старт';
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-primary');
    lapBtn.disabled = true;
    resetBtn.disabled = true;
    
    renderLaps();
}

// ===== ОТРИСОВКА КРУГОВ =====
function renderLaps() {
    if (laps.length === 0) {
        lapsContainer.innerHTML = '';
        return;
    }
    
    lapsContainer.innerHTML = laps.map((lap, index) => {
        const prevLap = index > 0 ? laps[index - 1].lap : 0;
        const diff = lap.lap - prevLap;
        const diffSign = diff >= 0 ? '+' : '';
        
        return `
            <div class="lap-item">
                <span class="lap-number">Круг ${lap.number}</span>
                <span class="lap-time">${formatTime(lap.lap)}</span>
                ${index > 0 ? `<span class="lap-diff">${diffSign}${formatTime(Math.abs(diff))}</span>` : ''}
            </div>
        `;
    }).join('');
    
    // Прокрутка вниз к последнему кругу
    lapsContainer.scrollTop = lapsContainer.scrollHeight;
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initTools() {
    if (!startBtn) return;   // если секции нет — выходим
    
    startBtn.addEventListener('click', toggleStart);
    lapBtn.addEventListener('click', addLap);
    resetBtn.addEventListener('click', reset);
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        // Только если секция инструментов активна
        const toolsSection = document.getElementById('toolsSection');
        if (!toolsSection?.classList.contains('active')) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            toggleStart();
        } else if (e.code === 'KeyL') {
            e.preventDefault();
            addLap();
        } else if (e.code === 'KeyR') {
            e.preventDefault();
            reset();
        }
    });
    
    console.log('✅ Инструменты загружены');
}

// ===== ЭКСПОРТ =====
export { initTools };