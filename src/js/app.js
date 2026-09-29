// /**
//  * Главный файл приложения
//  */

// // Импорты (для модульной системы)
//  import { initDatabase } from './database.js';
//  import { initStudents } from './students.js';
//  import { initSchedule } from './schedule.js';

// // Если используете обычные скрипты (без модулей), просто вызываем функции:

// document.addEventListener('DOMContentLoaded', async () => {
//     console.log('🚀 Coach-App запущено');

//     try {
//         // Инициализация базы данных
//         await initDatabase();
//         console.log('✅ База данных готова');

//         // Инициализация секции учеников
//         await initStudents();
//         console.log('✅ Ученики загружены');

//         await initSchedule();
//         console.log('✅ Расписание загружено');

//     } catch (error) {
//         console.error('❌ Ошибка инициализации:', error);
//         alert('Не удалось запустить приложение. Пожалуйста, перезапустите.');
//     }
// });

// import { getStudents, getTrainings } from './database.js';

// async function updateDashboard() {
//     try {
//         const students = await getStudents();
//         const trainings = await getTrainings();
//         const today = new Date().toISOString().split('T')[0];
//         const upcoming = trainings.filter(t => t.date >= today);

//         const studentsCount = document.getElementById('dashboardStudentsCount');
//         const trainingsCount = document.getElementById('dashboardTrainingsCount');
//         const upcomingCount = document.getElementById('dashboardUpcomingCount');

//         if (studentsCount) studentsCount.textContent = students.length;
//         if (trainingsCount) trainingsCount.textContent = trainings.length;
//         if (upcomingCount) upcomingCount.textContent = upcoming.length;
//     } catch (e) {
//         console.warn('Не удалось обновить статистику:', e);
//     }
// }

// Вызывайте после инициализации и после любых изменений
// document.addEventListener('DOMContentLoaded', updateDashboard);

import "./theme.js";
import { initDatabase, getStudents, getTrainings } from "./database.js";
import { initStudents } from "./students.js";
import { initSchedule } from "./schedule.js";
import { initTools } from './tools.js';

async function updateDashboard() {
  try {
    const students = await getStudents();
    const trainings = await getTrainings();
    const today = new Date().toISOString().split("T")[0];
    const upcoming = trainings.filter((t) => t.date >= today);

    const studentsCount = document.getElementById("dashboardStudentsCount");
    const trainingsCount = document.getElementById("dashboardTrainingsCount");
    const upcomingCount = document.getElementById("dashboardUpcomingCount");

    if (studentsCount) studentsCount.textContent = students.length;
    if (trainingsCount) trainingsCount.textContent = trainings.length;
    if (upcomingCount) upcomingCount.textContent = upcoming.length;
  } catch (e) {
    console.warn("Не удалось обновить статистику:", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Coach-App запущено");

  try {
    await initDatabase();
        console.log('✅ База данных готова');

        await initStudents();
        console.log('✅ Ученики загружены');

        await initSchedule();
        console.log('✅ Расписание загружено');

        await initTools();
        console.log('✅ Инструменты загружены');

        await updateDashboard();
        console.log('✅ Статистика обновлена');

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }    
});

window.addEventListener("dashboard:update", updateDashboard);

// Экспортируем для использования в других модулях
export { updateDashboard };
