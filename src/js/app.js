
import './theme.js';
import { initDatabase, getStudents, getTrainings } from './database.js';
import { initStudents } from './students.js';
import { initSchedule } from './schedule.js';
import { initTools } from './tools.js';
import { initCalendar, refreshCalendar } from './calendar.js';

async function updateDashboard() {
    try {
        const students = await getStudents();
        const trainings = await getTrainings();
        const today = new Date().toISOString().split('T')[0];
        const upcoming = trainings.filter(t => t.date >= today);

        const studentsCount = document.getElementById('dashboardStudentsCount');
        const trainingsCount = document.getElementById('dashboardTrainingsCount');
        const upcomingCount = document.getElementById('dashboardUpcomingCount');

        if (studentsCount) studentsCount.textContent = students.length;
        if (trainingsCount) trainingsCount.textContent = trainings.length;
        if (upcomingCount) upcomingCount.textContent = upcoming.length;
    } catch (e) {
        console.warn('Не удалось обновить статистику:', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Coach-App запущено');

    try {
        await initDatabase();
        console.log('✅ База данных готова');

        await initStudents();
        console.log('✅ Ученики загружены');

        await initSchedule();
        console.log('✅ Расписание загружено');

        await initTools();
        console.log('✅ Инструменты загружены');

        await initCalendar();
        console.log('✅ Календарь загружен');

        await updateDashboard();
        console.log('✅ Статистика обновлена');

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
});

// Обновление статистики при переходе на главную
window.addEventListener('dashboard:update', async () => {
    await updateDashboard();
    await refreshCalendar();
});

export { updateDashboard };