const { run, all, get } = require('./db');

async function initSchema() {
  // 1. Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Subjects table
  await run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // 3. Students table
  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      college_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Teachers table
  await run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id)
    )
  `);

  // 5. RFID cards table
  await run(`
    CREATE TABLE IF NOT EXISTS rfid_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE NOT NULL,
      student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // 6. Attendance Sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      session_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('scanning', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Attendance Entries table (temporary scans during active session)
  await run(`
    CREATE TABLE IF NOT EXISTS attendance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, student_id)
    )
  `);

  // 8. Attendance Records table (permanent finalized records per session)
  // Each attendance session creates a distinct class record per student.
  await run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE SET NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, student_id)
    )
  `);

  // Migration check: If attendance_records was created with old schema without session_id
  try {
    const tableInfo = await all('PRAGMA table_info(attendance_records)');
    const hasSessionId = tableInfo.some(col => col.name === 'session_id');

    if (!hasSessionId) {
      console.log('Migrating attendance_records table to support multi-session daily classes...');
      await run(`
        CREATE TABLE attendance_records_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE SET NULL,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          subject_id INTEGER NOT NULL REFERENCES subjects(id),
          date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(session_id, student_id)
        )
      `);

      // Copy existing records over
      await run(`
        INSERT INTO attendance_records_new (id, student_id, subject_id, date, status)
        SELECT id, student_id, subject_id, date, status FROM attendance_records
      `);

      await run('DROP TABLE attendance_records');
      await run('ALTER TABLE attendance_records_new RENAME TO attendance_records');
      console.log('Migration of attendance_records completed successfully.');
    }
  } catch (migErr) {
    console.warn('Migration note:', migErr.message);
  }

  console.log('Database schema verified/created successfully.');
}

module.exports = { initSchema };
