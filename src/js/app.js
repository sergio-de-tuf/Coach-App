/**
 * Главный файл приложения
 */

// Импорты (для модульной системы)
// Если используете ES Modules, раскомментируйте:
 import { initDatabase } from './database.js';
 import { initStudents } from './students.js';

// Если используете обычные скрипты (без модулей), просто вызываем функции:

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Coach-App запущено');
    
    try {
        // Инициализация базы данных
        await initDatabase();
        console.log('✅ База данных готова');
        
        // Инициализация секции учеников
        await initStudents();
        console.log('✅ Ученики загружены');
        
        // Здесь можно добавить инициализацию других секций
        // Например: расписание, тренировки и т.д.
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        alert('Не удалось запустить приложение. Пожалуйста, перезапустите.');
    }
});