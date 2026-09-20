/**
 * Управление темой приложения и бургер-меню
 * Поддерживает сохранение выбора пользователя в localStorage
 */

// ===== НАСТРОЙКИ =====
const STORAGE_KEY = 'coach-app-theme';
const THEME_ATTRIBUTE = 'data-theme';
const THEME_ICONS = {
    light: '🌙',  // Показываем луну, когда светлая тема (нажать для переключения на тёмную)
    dark: '☀️'    // Показываем солнце, когда тёмная тема (нажать для переключения на светлую)
};

// ===== СОСТОЯНИЕ =====
let currentTheme = 'light';
let isTransitioning = false;
let isMenuOpen = false;

// ===== DOM ЭЛЕМЕНТЫ =====
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle?.querySelector('.theme-icon');
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

// ===== ФУНКЦИИ ДЛЯ ТЕМЫ =====

/**
 * Установка темы
 * @param {string} theme - 'light' или 'dark'
 */
function setTheme(theme) {
    if (isTransitioning) return;
    isTransitioning = true;

    currentTheme = theme;
    
    // Устанавливаем атрибут на html для CSS
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    
    // Обновляем иконку
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? THEME_ICONS.light : THEME_ICONS.dark;
    }
    
    // Сохраняем в localStorage
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        // Если localStorage недоступен (например, в WebView)
        console.warn('Не удалось сохранить тему в localStorage:', e);
    }
    
    // Анимация кнопки
    if (themeToggle) {
        themeToggle.classList.add('active');
        setTimeout(() => {
            themeToggle.classList.remove('active');
        }, 300);
    }
    
    // Добавляем небольшую задержку, чтобы анимация успела завершиться
    setTimeout(() => {
        isTransitioning = false;
    }, 350);
}

/**
 * Переключение темы
 */
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

/**
 * Загрузка сохранённой темы или определение системной
 */
function loadTheme() {
    let savedTheme = null;
    
    // Пытаемся загрузить из localStorage
    try {
        savedTheme = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        // localStorage недоступен
    }
    
    // Если тема сохранена — используем её
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme);
        return;
    }
    
    // Если нет сохранённой темы — проверяем системную
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        return;
    }
    
    // По умолчанию — светлая
    setTheme('light');
}

/**
 * Отслеживание изменения системной темы
 */
function watchSystemTheme() {
    if (!window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
        // Меняем тему только если пользователь явно не сохранил свою
        const hasSavedTheme = localStorage.getItem(STORAGE_KEY) !== null;
        if (!hasSavedTheme) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// ===== ФУНКЦИИ ДЛЯ БУРГЕР-МЕНЮ =====

/**
 * Открытие/закрытие мобильного меню
 */
function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    
    if (isMenuOpen) {
        openMenu();
    } else {
        closeMenu();
    }
}

/**
 * Открыть меню
 */
function openMenu() {
    isMenuOpen = true;
    
    // Добавляем классы для анимации
    if (menuToggle) {
        menuToggle.classList.add('active');
    }
    if (mobileMenu) {
        mobileMenu.classList.add('open');
        // Блокируем прокрутку страницы
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Закрыть меню
 */
function closeMenu() {
    isMenuOpen = false;
    
    // Убираем классы
    if (menuToggle) {
        menuToggle.classList.remove('active');
    }
    if (mobileMenu) {
        mobileMenu.classList.remove('open');
        // Возвращаем прокрутку
        document.body.style.overflow = '';
    }
}

/**
 * Закрыть меню при клике вне его
 */
function handleClickOutside(event) {
    if (!isMenuOpen) return;
    
    const target = event.target;
    const isMenuToggle = menuToggle?.contains(target);
    const isMobileMenu = mobileMenu?.contains(target);
    
    // Если клик был НЕ по кнопке меню и НЕ по самому меню
    if (!isMenuToggle && !isMobileMenu) {
        closeMenu();
    }
}

/**
 * Закрыть меню при нажатии на Esc
 */
function handleEscKey(event) {
    if (event.key === 'Escape' && isMenuOpen) {
        closeMenu();
    }
}

/**
 * Закрыть меню при изменении размера окна (если становится больше 768px)
 */
function handleResize() {
    if (window.innerWidth > 768 && isMenuOpen) {
        closeMenu();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener('DOMContentLoaded', () => {
    // Загружаем тему
    loadTheme();
    
    // Начинаем следить за системной темой
    watchSystemTheme();
    
    // ===== Обработчики для темы =====
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.setAttribute('aria-label', 'Переключить тему');
    }
    
    // ===== Обработчики для бургер-меню =====
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
        menuToggle.setAttribute('aria-label', 'Открыть меню');
    }
    
    // Закрытие меню при клике по ссылке
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Убираем активный класс у всех ссылок
            mobileNavLinks.forEach(l => l.classList.remove('active'));
            // Добавляем активный класс на кликнутую
            e.target.classList.add('active');
            
            // Закрываем меню
            closeMenu();
        });
    });
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', handleClickOutside);
    
    // Закрытие меню по Esc
    document.addEventListener('keydown', handleEscKey);
    
    // Закрытие меню при изменении размера окна
    window.addEventListener('resize', handleResize);
});

// ===== ДОПОЛНИТЕЛЬНО: ОБНОВЛЕНИЕ ПРИ ВОССТАНОВЛЕНИИ ВКЛАДКИ =====

// Если вкладка была в фоне и тема изменилась через системные настройки
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Проверяем, не изменилась ли системная тема
        if (window.matchMedia && localStorage.getItem(STORAGE_KEY) === null) {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const current = document.documentElement.getAttribute(THEME_ATTRIBUTE);
            const expected = isDark ? 'dark' : 'light';
            if (current !== expected) {
                setTheme(expected);
            }
        }
    }
});

// Экспортируем функции для использования в других модулях (если нужно)
// export { setTheme, toggleTheme, loadTheme, openMenu, closeMenu };