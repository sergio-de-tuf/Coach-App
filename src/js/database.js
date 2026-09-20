/**
 * Модуль для работы с SQLite через Capacitor
 */

// ===== ПРОВЕРКА ОКРУЖЕНИЯ =====
const isNative = () => {
    return !!window?.Capacitor?.isNativePlatform?.();
};

// ===== ИНИЦИАЛИЗАЦИЯ БД =====
let db = null;

async function initDatabase() {
    try {
        if (isNative()) {
            // Нативная платформа (Android) — используем Capacitor SQLite
            const { CapacitorSQLite, SQLiteConnection } =
                await import("@capacitor-community/sqlite");
            const sqlite = new SQLiteConnection(CapacitorSQLite);

            db = await sqlite.createConnection(
                "coach_app_db",
                false,
                "no-encryption",
                1,
            );
            await db.open();

            console.log("✅ База данных SQLite инициализирована (нативная)");
        } else {
            // Веб-платформа — используем sql.js (для разработки)
            const SQL = await window.initSqlJs({
                locateFile: (file) => `assets/${file}`
            });

            let dbData = null;
            try {
                const saved = localStorage.getItem("coach_app_db_data");
                if (saved) {
                    const buffer = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
                    dbData = new Uint8Array(buffer);
                }
            } catch (e) {}

            db = new SQL.Database(dbData);
            console.log("✅ База данных SQLite инициализирована (веб)");
        }

        // Создаём таблицы
        await createTables();

        return db;
    } catch (error) {
        console.error("❌ Ошибка инициализации БД:", error);
        throw error;
    }
}

async function createTables() {
    // Таблица учеников
    await executeRun(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await executeRun(`
        CREATE INDEX IF NOT EXISTS idx_students_name ON students(first_name, last_name)
    `);

    await executeRun(`
        CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone)
    `);

    // Таблица тренировок
    await executeRun(`
        CREATE TABLE IF NOT EXISTS trainings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            place TEXT NOT NULL,
            duration INTEGER,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    await executeRun(`
        CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(date)
    `);

    await executeRun(`
        CREATE INDEX IF NOT EXISTS idx_trainings_student ON trainings(student_id)
    `);

    console.log("✅ Таблицы созданы");
}

// ===== БАЗОВЫЕ ЗАПРОСЫ =====

async function executeQuery(query, params = []) {
    try {
        if (isNative()) {
            const result = await db.query(query, params);
            return result.values || [];
        } else {
            const stmt = db.prepare(query);
            stmt.bind(params);
            const result = [];
            while (stmt.step()) {
                result.push(stmt.getAsObject());
            }
            stmt.free();
            return result;
        }
    } catch (error) {
        console.error("❌ Ошибка выполнения запроса:", error, query);
        throw error;
    }
}

async function executeRun(query, params = []) {
    try {
        if (isNative()) {
            const result = await db.run(query, params);
            return result;
        } else {
            const stmt = db.prepare(query);
            stmt.run(params);
            stmt.free();
            const lastIdResult = db.exec("SELECT last_insert_rowid()");
            const lastId = lastIdResult[0]?.values?.[0]?.[0] || 0;
            return { changes: db.getRowsModified(), lastInsertRowid: lastId };
        }
    } catch (error) {
        console.error("❌ Ошибка выполнения запроса:", error, query);
        throw error;
    }
}

// ===== СОХРАНЕНИЕ ВЕБ-БАЗЫ =====
function saveWebDatabase() {
    if (!isNative() && db) {
        try {
            const data = db.export();
            const encoded = btoa(String.fromCharCode.apply(null, data));
            localStorage.setItem("coach_app_db_data", encoded);
        } catch (e) {
            console.warn("Не удалось сохранить БД:", e);
        }
    }
}

// ===== ФУНКЦИИ ДЛЯ УЧЕНИКОВ =====

async function getStudents() {
    const query = `
        SELECT 
            id, 
            first_name as firstName, 
            last_name as lastName, 
            phone, 
            email, 
            note, 
            created_at as createdAt,
            updated_at as updatedAt
        FROM students 
        ORDER BY last_name ASC, first_name ASC
    `;
    return await executeQuery(query);
}

async function searchStudents(searchTerm) {
    const term = `%${searchTerm}%`;
    const query = `
        SELECT 
            id, 
            first_name as firstName, 
            last_name as lastName, 
            phone, 
            email, 
            note, 
            created_at as createdAt,
            updated_at as updatedAt
        FROM students 
        WHERE first_name LIKE ? 
           OR last_name LIKE ? 
           OR phone LIKE ?
        ORDER BY last_name ASC, first_name ASC
    `;
    return await executeQuery(query, [term, term, term]);
}

async function addStudent(student) {
    const query = `
        INSERT INTO students (first_name, last_name, phone, email, note)
        VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
        student.firstName,
        student.lastName,
        student.phone,
        student.email || null,
        student.note || null
    ];

    const result = await executeRun(query, params);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

async function updateStudent(id, student) {
    const query = `
        UPDATE students 
        SET first_name = ?, 
            last_name = ?, 
            phone = ?, 
            email = ?, 
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const params = [
        student.firstName,
        student.lastName,
        student.phone,
        student.email || null,
        student.note || null,
        id
    ];

    const result = await executeRun(query, params);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

async function deleteStudent(id) {
    const query = "DELETE FROM students WHERE id = ?";
    const result = await executeRun(query, [id]);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

async function getStudentById(id) {
    const query = `
        SELECT 
            id, 
            first_name as firstName, 
            last_name as lastName, 
            phone, 
            email, 
            note
        FROM students 
        WHERE id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
}

// ===== ФУНКЦИИ ДЛЯ ТРЕНИРОВОК =====

async function getTrainings() {
    const query = `
        SELECT 
            t.id,
            t.student_id as studentId,
            t.date,
            t.time,
            t.place,
            t.duration,
            t.note,
            t.created_at as createdAt,
            s.first_name as studentFirstName,
            s.last_name as studentLastName
        FROM trainings t
        LEFT JOIN students s ON s.id = t.student_id
        ORDER BY t.date DESC, t.time DESC
    `;
    return await executeQuery(query);
}

async function getTrainingsByStudent(studentId) {
    const query = `
        SELECT 
            id, 
            student_id as studentId, 
            date, 
            time, 
            place, 
            duration, 
            note
        FROM trainings 
        WHERE student_id = ?
        ORDER BY date DESC, time DESC
    `;
    return await executeQuery(query, [studentId]);
}

async function getTrainingById(id) {
    const query = `
        SELECT 
            id, 
            student_id as studentId, 
            date, 
            time, 
            place, 
            duration, 
            note
        FROM trainings 
        WHERE id = ?
    `;
    const results = await executeQuery(query, [id]);
    return results[0] || null;
}

async function addTraining(training) {
    const query = `
        INSERT INTO trainings (student_id, date, time, place, duration, note)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
        training.studentId,
        training.date,
        training.time,
        training.place,
        training.duration || null,
        training.note || null
    ];

    const result = await executeRun(query, params);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

async function updateTraining(id, training) {
    const query = `
        UPDATE trainings 
        SET student_id = ?, 
            date = ?, 
            time = ?, 
            place = ?, 
            duration = ?, 
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const params = [
        training.studentId,
        training.date,
        training.time,
        training.place,
        training.duration || null,
        training.note || null,
        id
    ];

    const result = await executeRun(query, params);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

async function deleteTraining(id) {
    const query = "DELETE FROM trainings WHERE id = ?";
    const result = await executeRun(query, [id]);

    if (!isNative()) {
        saveWebDatabase();
    }

    return result;
}

// ===== ЭКСПОРТ =====
export {
    initDatabase,
    getStudents,
    searchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentById,
    getTrainings,
    getTrainingsByStudent,
    getTrainingById,
    addTraining,
    updateTraining,
    deleteTraining,
    isNative
};