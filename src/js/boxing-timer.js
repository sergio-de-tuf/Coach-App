/**
 * Boxing Timer — таймер для бокса/единоборств
 * 
 * Фазы:
 * 1. PREP — подготовка (10 сек)
 * 2. ROUND — раунд (N сек)
 * 3. REST — отдых (N сек)
 * 4. повтор 2-3
 * 5. DONE — завершение
 */

// ===== СОСТОЯНИЕ =====
let boxingState = {
    isRunning: false,
    currentPhase: 'idle',      // idle | prep | round | rest | done
    timeLeft: 0,               // секунды
    currentRound: 0,
    totalRounds: 3,
    roundTime: 120,
    restTime: 60,
    prepTime: 10,
    intervalId: null,
    audioCtx: null
};

// ===== DOM ЭЛЕМЕНТЫ =====
const settingsBlock = document.getElementById('boxingSettings');
const roundTimeInput = document.getElementById('roundTime');
const restTimeInput = document.getElementById('restTime');
const roundsCountInput = document.getElementById('roundsCount');
const statusBlock = document.getElementById('boxingStatus');
const phaseEl = document.getElementById('boxingPhase');
const displayEl = document.getElementById('boxingDisplay');
const roundInfoEl = document.getElementById('boxingRoundInfo');
const startBtn = document.getElementById('boxingStart');
const pauseBtn = document.getElementById('boxingPause');
const resetBtn = document.getElementById('boxingReset');
const presetBtns = document.querySelectorAll('.preset-btn');

// ===== ЗВУК =====
function initAudio() {
    if (!boxingState.audioCtx) {
        try {
            boxingState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API не поддерживается');
        }
    }
}

/**
 * Воспроизведение удара гонга (синтез)
 * @param {number} intensity — интенсивность (1 = обычный, 1.5 = мощный)
 */
function playGong(intensity = 1) {
    if (!boxingState.audioCtx) return;
    
    try {
        const ctx = boxingState.audioCtx;
        const now = ctx.currentTime;
        const duration = 3.5;
        
        // Мастер-громкость
        const masterGain = ctx.createGain();
        masterGain.gain.value = 1.0;
        masterGain.connect(ctx.destination);
        
        // Частоты гонга (гармоники)
        const frequencies = [
            { freq: 110, gain: 0.6 },
            { freq: 165, gain: 0.45 },
            { freq: 220, gain: 0.35 },
            { freq: 330, gain: 0.25 },
            { freq: 440, gain: 0.15 }
        ];
        
        frequencies.forEach(({ freq, gain }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const peakGain = gain * intensity;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.01);   // резкий удар
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);   // затухание
            
            osc.start(now);
            osc.stop(now + duration);
        });
        
        // Металлический призвук (шум)
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 3);
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 1.5;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15 * intensity, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        noiseSource.start(now);
        noiseSource.stop(now + 1.5);
        
    } catch (e) {
        console.warn('Ошибка воспроизведения гонга:', e);
    }
}

// ===== ЗВУКОВЫЕ ОБЁРТКИ =====

function playRoundStart() {
    playGong(1.2);   // мощный гонг на старте раунда
}

function playRestStart() {
    playGong(0.8);   // чуть тише на отдыхе
}

function playCountdown() {
    // Короткий сигнал за 3 сек до конца раунда
    if (!boxingState.audioCtx) return;
    try {
        const ctx = boxingState.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = 1200;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
}

function playFinish() {
    // Тройной гонг на завершение
    playGong(1.5);
    setTimeout(() => playGong(1.5), 800);
    setTimeout(() => playGong(1.5), 1600);
}

// ===== ФОРМАТИРОВАНИЕ =====
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateUI() {
    displayEl.textContent = formatTime(boxingState.timeLeft);
    roundInfoEl.textContent = `Раунд ${boxingState.currentRound} / ${boxingState.totalRounds}`;
    
    // Классы фаз
    statusBlock.classList.remove('phase-prep', 'phase-round', 'phase-rest', 'phase-done', 'warning');
    
    if (boxingState.currentPhase === 'prep') {
        statusBlock.classList.add('phase-prep');
        phaseEl.textContent = 'Подготовка';
    } else if (boxingState.currentPhase === 'round') {
        statusBlock.classList.add('phase-round');
        phaseEl.textContent = '🥊 РАУНД';
        
        // Предупреждение за 3 секунды
        if (boxingState.timeLeft <= 3 && boxingState.timeLeft > 0) {
            statusBlock.classList.add('warning');
        }
    } else if (boxingState.currentPhase === 'rest') {
        statusBlock.classList.add('phase-rest');
        phaseEl.textContent = '😮‍💨 Отдых';
    } else if (boxingState.currentPhase === 'done') {
        statusBlock.classList.add('phase-done');
        phaseEl.textContent = '🎉 Тренировка завершена!';
        displayEl.textContent = 'ГОТОВО';
    } else {
        phaseEl.textContent = 'Готов к старту';
    }
}

// ===== ЛОГИКА ТАЙМЕРА =====
function startBoxing() {
    initAudio();
    
    // Читаем настройки
    boxingState.roundTime = Math.min(parseInt(roundTimeInput.value) || 120, 300);
    boxingState.restTime = Math.min(parseInt(restTimeInput.value) || 60, 300);
    boxingState.totalRounds = Math.min(parseInt(roundsCountInput.value) || 3, 20);
    
    // Блокируем настройки
    settingsBlock.style.pointerEvents = 'none';
    settingsBlock.style.opacity = '0.5';
    presetBtns.forEach(b => b.disabled = true);
    
    if (boxingState.currentPhase === 'idle' || boxingState.currentPhase === 'done') {
        // Начинаем с подготовки
        boxingState.currentPhase = 'prep';
        boxingState.timeLeft = boxingState.prepTime;
        boxingState.currentRound = 0;
    }
    
    boxingState.isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    updateUI();
    tick();
}

function tick() {
    clearInterval(boxingState.intervalId);
    
    boxingState.intervalId = setInterval(() => {
        if (!boxingState.isRunning) return;
        
        boxingState.timeLeft--;
        
        // Сигнал за 3 секунды до конца раунда
        if (boxingState.currentPhase === 'round' && boxingState.timeLeft <= 3 && boxingState.timeLeft > 0) {
            playCountdown();
        }
        
        if (boxingState.timeLeft <= 0) {
            nextPhase();
        }
        
        updateUI();
    }, 1000);
}

function nextPhase() {
    if (boxingState.currentPhase === 'prep') {
        // Подготовка → первый раунд
        boxingState.currentPhase = 'round';
        boxingState.currentRound = 1;
        boxingState.timeLeft = boxingState.roundTime;
        playRoundStart();
        
    } else if (boxingState.currentPhase === 'round') {
        // Раунд → отдых или завершение
        if (boxingState.currentRound >= boxingState.totalRounds) {
            // Это был последний раунд
            boxingState.currentPhase = 'done';
            boxingState.isRunning = false;
            clearInterval(boxingState.intervalId);
            playFinish();
            unlockSettings();
        } else {
            // Отдых
            boxingState.currentPhase = 'rest';
            boxingState.timeLeft = boxingState.restTime;
            playRestStart();
        }
        
    } else if (boxingState.currentPhase === 'rest') {
        // Отдых → следующий раунд
        boxingState.currentRound++;
        boxingState.currentPhase = 'round';
        boxingState.timeLeft = boxingState.roundTime;
        playRoundStart();
    }
    
    updateUI();
}

function pauseBoxing() {
    boxingState.isRunning = false;
    clearInterval(boxingState.intervalId);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = '▶ Продолжить';
}

function resetBoxing() {
    boxingState.isRunning = false;
    boxingState.currentPhase = 'idle';
    boxingState.currentRound = 0;
    boxingState.timeLeft = Math.min(parseInt(roundTimeInput.value) || 120, 300);
    clearInterval(boxingState.intervalId);
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = '▶ Старт';
    
    unlockSettings();
    updateUI();
}

function unlockSettings() {
    settingsBlock.style.pointerEvents = 'auto';
    settingsBlock.style.opacity = '1';
    presetBtns.forEach(b => b.disabled = false);
}

// ===== ПРЕСЕТЫ =====
function applyPreset(btn) {
    const round = parseInt(btn.dataset.round);
    const rest = parseInt(btn.dataset.rest);
    const rounds = parseInt(btn.dataset.rounds);
    
    roundTimeInput.value = round;
    restTimeInput.value = rest;
    roundsCountInput.value = rounds;
    
    // Сброс таймера при смене пресета
    resetBoxing();
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initBoxingTimer() {
    if (!startBtn) return;   // если секции нет — выходим
    
    // Начальное состояние дисплея
    displayEl.textContent = formatTime(Math.min(parseInt(roundTimeInput.value) || 120, 300));
    
    startBtn.addEventListener('click', startBoxing);
    pauseBtn.addEventListener('click', pauseBoxing);
    resetBtn.addEventListener('click', resetBoxing);
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn));
    });
    
    // Изменение настроек — обновляем дисплей
    roundTimeInput.addEventListener('input', () => {
        if (boxingState.currentPhase === 'idle') {
            boxingState.timeLeft = Math.min(parseInt(roundTimeInput.value) || 120, 300);
            updateUI();
        }
    });
    
    // Горячие клавиши (только когда секция активна)
    document.addEventListener('keydown', (e) => {
        const toolsSection = document.getElementById('toolsSection');
        if (!toolsSection?.classList.contains('active')) return;
        
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            if (boxingState.isRunning) {
                pauseBoxing();
            } else {
                startBoxing();
            }
        } else if (e.code === 'KeyR' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            resetBoxing();
        }
    });
    
    roundTimeInput.addEventListener('blur', () => {
        let val = parseInt(roundTimeInput.value) || 120;
        if (val < 10) val = 10;
        if (val > 300) val = 300;
        roundTimeInput.value = val;
        
        if (boxingState.currentPhase === 'idle') {
            boxingState.timeLeft = val;
            updateUI();
        }
    });
    
    restTimeInput.addEventListener('blur', () => {
        let val = parseInt(restTimeInput.value) || 60;
        if (val < 5) val = 5;
        if (val > 300) val = 300;
        restTimeInput.value = val;
    });
    
    roundsCountInput.addEventListener('blur', () => {
        let val = parseInt(roundsCountInput.value) || 3;
        if (val < 1) val = 1;
        if (val > 20) val = 20;
        roundsCountInput.value = val;
    });
    
    console.log('✅ Boxing Timer загружен');
}

// ===== ЭКСПОРТ =====
export { initBoxingTimer };