const bcrypt = require('bcryptjs');
const { run, get, all } = require('./db');
const { initSchema } = require('./schema');

async function seed() {
  await initSchema();

  console.log('Seeding database...');

  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  // 1. Subjects
  const subjects = ['MIS', 'IRS', 'STQA'];
  const subjectMap = {};

  for (const sub of subjects) {
    let existing = await get('SELECT id FROM subjects WHERE name = ?', [sub]);
    if (!existing) {
      const res = await run('INSERT INTO subjects (name) VALUES (?)', [sub]);
      subjectMap[sub] = res.lastID;
    } else {
      subjectMap[sub] = existing.id;
    }
  }

  // 2. Teachers
  const teachers = [
    { name: 'Teacher MIS', email: 'mis@college.com', subject: 'MIS' },
    { name: 'Teacher IRS', email: 'irs@college.com', subject: 'IRS' },
    { name: 'Teacher STQA', email: 'stqa@college.com', subject: 'STQA' }
  ];

  for (const t of teachers) {
    let user = await get('SELECT id FROM users WHERE email = ?', [t.email]);
    let userId;
    if (!user) {
      const res = await run(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [t.email, teacherPasswordHash, 'teacher']
      );
      userId = res.lastID;
    } else {
      userId = user.id;
    }

    let teacherRecord = await get('SELECT id FROM teachers WHERE user_id = ?', [userId]);
    if (!teacherRecord) {
      await run(
        'INSERT INTO teachers (user_id, name, subject_id) VALUES (?, ?, ?)',
        [userId, t.name, subjectMap[t.subject]]
      );
    }
  }

  // 3. Students & RFID Mappings
  const students = [
    {
      name: 'Mudit Meshram',
      college_id: '202303034',
      department: 'Information Technology',
      email: 'student@example.com',
      rfid: '80:88:60:2A'
    },
    {
      name: 'Rishabh Kanojiya',
      college_id: '202303035',
      department: 'Information Technology',
      email: 'rishabh@example.com',
      rfid: '7C:3E:7E:B0'
    },
    {
      name: 'Atharva Ghorpade',
      college_id: '202303036',
      department: 'Information Technology',
      email: 'atharva@example.com',
      rfid: 'CC:BD:CD:B0'
    },
    {
      name: 'Siddhi Jadhav',
      college_id: '202303037',
      department: 'Information Technology',
      email: 'siddhi@example.com',
      rfid: '42:C5:56:D9'
    }
  ];

  const studentMap = {};

  for (const s of students) {
    let user = await get('SELECT id FROM users WHERE email = ?', [s.email]);
    let userId;
    if (!user) {
      const res = await run(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [s.email, studentPasswordHash, 'student']
      );
      userId = res.lastID;
    } else {
      userId = user.id;
    }

    let student = await get('SELECT id FROM students WHERE college_id = ?', [s.college_id]);
    let studentId;
    if (!student) {
      const res = await run(
        'INSERT INTO students (user_id, college_id, name, department) VALUES (?, ?, ?, ?)',
        [userId, s.college_id, s.name, s.department]
      );
      studentId = res.lastID;
    } else {
      studentId = student.id;
    }
    studentMap[s.college_id] = studentId;

    // RFID Card
    let rfid = await get('SELECT id FROM rfid_cards WHERE uid = ?', [s.rfid]);
    if (!rfid) {
      await run('INSERT INTO rfid_cards (uid, student_id) VALUES (?, ?)', [s.rfid, studentId]);
    }
  }

  // 4. Seed initial attendance records for realistic stats
  // Mudit: MIS 18/20 (90%), IRS 15/20 (75%), STQA 17/20 (85%) => Overall 50/60 = 83.3% (~82%)
  const muditId = studentMap['202303034'];
  const existingRecordsCount = await get(
    'SELECT COUNT(*) as count FROM attendance_records WHERE student_id = ?',
    [muditId]
  );

  if (existingRecordsCount.count === 0) {
    console.log('Seeding initial attendance history for sample statistics...');
    // Generate 20 dates in the past
    const baseDate = new Date('2026-09-01');
    const allStudents = Object.values(studentMap);

    for (let i = 0; i < 20; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // MIS: 20 sessions (Mudit present on 18, absent on 2 e.g. i=5, 12)
      for (const stId of allStudents) {
        let status = 'Present';
        if (stId === muditId && (i === 5 || i === 12)) status = 'Absent';
        if (stId !== muditId && i % 4 === 0) status = 'Absent';
        await run(
          'INSERT OR IGNORE INTO attendance_records (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)',
          [stId, subjectMap['MIS'], dateStr, status]
        );
      }

      // IRS: 20 sessions (Mudit present on 15, absent on 5 e.g. i=2, 6, 9, 14, 18)
      for (const stId of allStudents) {
        let status = 'Present';
        if (stId === muditId && [2, 6, 9, 14, 18].includes(i)) status = 'Absent';
        if (stId !== muditId && i % 3 === 0) status = 'Absent';
        await run(
          'INSERT OR IGNORE INTO attendance_records (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)',
          [stId, subjectMap['IRS'], dateStr, status]
        );
      }

      // STQA: 20 sessions (Mudit present on 17, absent on 3 e.g. i=3, 11, 17)
      for (const stId of allStudents) {
        let status = 'Present';
        if (stId === muditId && [3, 11, 17].includes(i)) status = 'Absent';
        if (stId !== muditId && i % 5 === 0) status = 'Absent';
        await run(
          'INSERT OR IGNORE INTO attendance_records (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)',
          [stId, subjectMap['STQA'], dateStr, status]
        );
      }
    }
  }

  console.log('Seeding completed successfully!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = { seed };
