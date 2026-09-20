/**
 * Модуль для работы с SQLite через Capacitor
 */

// ===== ПРОВЕРКА ОКРУЖЕНИЯ =====
const isNative = () => {
  return !!window?.Capacitor?.isNativePlatform?.();
};

// ===== ИНИЦИАЛИЗАЦИЯ БД =====
let db = null;

/**
 * Инициализация базы данных
 */
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
      const initSqlJs = (await import('../assets/sql-wasm.js')).default;
    const SQL = await window.initSqlJs({
        locateFile: (file) => `assets/${file}`
      });

      // Создаём базу в памяти (или загружаем из localStorage)
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

/**
 * Создание таблиц
 */
async function createTables() {
  const query = `
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_students_name ON students(first_name, last_name);
        CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
    `;

  await executeQuery(query);
  console.log("✅ Таблицы созданы");
}

/**
 * Выполнение запроса (SELECT)
 */
async function executeQuery(query, params = []) {
  try {
    if (isNative()) {
      // Нативная платформа
      const result = await db.query(query, params);
      return result.values || [];
    } else {
      // Веб-платформа
      const stmt = db.prepare(query);
      const result = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row);
      }
      stmt.free();
      return result;
    }
  } catch (error) {
    console.error("❌ Ошибка выполнения запроса:", error, query);
    throw error;
  }
}

/**
 * Выполнение запроса (INSERT, UPDATE, DELETE)
 */
async function executeRun(query, params = []) {
  try {
    if (isNative()) {
      // Нативная платформа
      const result = await db.run(query, params);
      return result;
    } else {
      // Веб-платформа
      const stmt = db.prepare(query);
      stmt.run(params);
      stmt.free();
      return {
        changes: db.getRowsModified(),
        lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0].values[0][0],
      };
    }
  } catch (error) {
    console.error("❌ Ошибка выполнения запроса:", error, query);
    throw error;
  }
}

/**
 * Сохранение веб-базы в localStorage
 */
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

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С УЧЕНИКАМИ =====

/**
 * Получить всех учеников
 */
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

/**
 * Поиск учеников
 */
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

/**
 * Добавить ученика
 */
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
    student.note || null,
  ];

  const result = await executeRun(query, params);

  if (!isNative()) {
    saveWebDatabase();
  }

  return result;
}

/**
 * Обновить ученика
 */
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
    id,
  ];

  const result = await executeRun(query, params);

  if (!isNative()) {
    saveWebDatabase();
  }

  return result;
}

/**
 * Удалить ученика
 */
async function deleteStudent(id) {
  const query = "DELETE FROM students WHERE id = ?";
  const result = await executeRun(query, [id]);

  if (!isNative()) {
    saveWebDatabase();
  }

  return result;
}

/**
 * Получить ученика по ID
 */
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

// Экспортируем функции
export {
  initDatabase,
  getStudents,
  searchStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getStudentById,
  isNative,
};
