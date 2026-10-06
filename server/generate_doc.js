const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} = require('docx');

// Colors
const PRIMARY = '1E1B4B';   // Deep Navy / Indigo
const ACCENT = '4F46E5';    // Vibrant Indigo
const SUCCESS = '059669';   // Emerald
const DARK_GRAY = '334155'; // Slate
const LIGHT_BG = 'F8FAFC';  // Light background for callouts/tables
const BORDER_COLOR = 'CBD5E1';

function heading1(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    run: {
      color: PRIMARY,
      bold: true,
      size: 32, // 16pt
      font: 'Calibri'
    }
  });
}

function heading2(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    run: {
      color: ACCENT,
      bold: true,
      size: 26, // 13pt
      font: 'Calibri'
    }
  });
}

function heading3(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    run: {
      color: DARK_GRAY,
      bold: true,
      size: 22, // 11pt
      font: 'Calibri'
    }
  });
}

function paragraph(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [
      new TextRun({
        text: text,
        size: 22, // 11pt
        font: 'Calibri',
        color: options.color || '1E293B',
        bold: !!options.bold,
        italics: !!options.italics
      })
    ]
  });
}

function bullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 22,
        font: 'Calibri',
        color: '0F172A'
      })
    );
  }
  children.push(
    new TextRun({
      text: text,
      size: 22,
      font: 'Calibri',
      color: '334155'
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60 },
    children
  });
}

function callout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'EEF2FF' },
            borders: {
              left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE }
            },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: title, bold: true, color: ACCENT, size: 22, font: 'Calibri' })
                ]
              }),
              new Paragraph({
                spacing: { before: 60 },
                children: [
                  new TextRun({ text: text, color: '334155', size: 20, font: 'Calibri' })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createTable(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: PRIMARY },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY },
        left: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY },
        right: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY }
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })
          ]
        })
      ]
    }))
  });

  const bodyRows = rows.map((r, idx) => new TableRow({
    children: r.map(c => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? 'FFFFFF' : LIGHT_BG },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
        left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
        right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR }
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: c, size: 20, font: 'Calibri', color: '1E293B' })
          ]
        })
      ]
    }))
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows]
  });
}

async function generateDocumentation() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children: [
          // Project Title Banner
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'RFID ATTENDANCE MANAGEMENT SYSTEM',
                bold: true,
                size: 40, // 20pt
                color: PRIMARY,
                font: 'Calibri'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Complete Technical Project Report & Comprehensive Documentation',
                italics: true,
                size: 24,
                color: ACCENT,
                font: 'Calibri'
              })
            ]
          }),

          callout(
            'PROJECT SUMMARY & EXECUTIVE BRIEF',
            'This project is an end-to-end IoT and Full-Stack Web Application for automated, fraud-proof classroom attendance management. It integrates physical RFID hardware (ESP8266 NodeMCU + RC522 reader) with a modern Node.js/Express backend, SQLite database, and a real-time React 19 frontend using WebSockets.'
          ),

          new Paragraph({ spacing: { before: 200 } }),

          // ==========================================
          // 1. WHAT IT DOES
          // ==========================================
          heading1('1. WHAT THE PROJECT DOES'),
          paragraph(
            'The RFID Attendance Management System completely automates the process of recording and calculating student attendance in educational institutions. Traditional attendance systems rely on physical roll-call registers or manual paper sign-ins, which are time-consuming, prone to human error, and vulnerable to proxy attendance.'
          ),
          paragraph(
            'This project delivers a seamless digital workflow that bridges physical classroom presence with instant cloud synchronization:'
          ),

          bullet('Instant Student Verification: When a student taps their contactless RFID card onto the hardware reader, their identity is verified within milliseconds.', '• Contactless Card Scanning:'),
          bullet('Live Faculty Feed: As cards are tapped, the scanned student\'s name, college ID, department, and timestamp appear immediately on the teacher\'s active dashboard screen via WebSockets.', '• Real-Time Screen Updates:'),
          bullet('Duplicate & Proxy Prevention: The system rejects cards tapped more than once within the same session and verifies valid card ownership.', '• Anti-Fraud Mechanisms:'),
          bullet('Automated Absence Marking: Unscanned students are automatically marked "Absent" upon session finalization, eliminating manual roll-calling.', '• Automated Absence Logic:'),
          bullet('75% Statutory Compliance Tracking: Automatically calculates overall and subject-wise percentages and flags students falling below the mandatory 75% attendance threshold.', '• Eligibility Tracking:'),
          bullet('Student & Faculty Portals: Provides dedicated, role-protected portals where students track attendance stats and faculty manage scanning sessions.', '• Role-Based Access:'),

          // ==========================================
          // 2. HOW IT DOES IT
          // ==========================================
          heading1('2. HOW THE SYSTEM WORKS (ARCHITECTURE & WORKFLOW)'),
          paragraph(
            'The system follows a multi-tiered architecture combining IoT Hardware, RESTful APIs, WebSocket event streaming, Relational Database management, and Reactive Single Page Applications.'
          ),

          heading2('2.1 End-to-End Operational Lifecycle'),
          bullet('The teacher logs in to the Faculty Portal (e.g., MIS, IRS, STQA) and clicks "Start RFID Scan". The server initializes an attendance session in the database with status = "scanning".', 'Step 1: Session Initialization —'),
          bullet('The student taps their 13.56 MHz Mifare RFID card on the MFRC522 scanner. The ESP8266 NodeMCU reads the Unique Identifier (UID) over the SPI bus.', 'Step 2: Physical Hardware Tap —'),
          bullet('The ESP8266 transmits an HTTP POST request containing the UID to http://<SERVER_IP>:5000/api/rfid/scan over local Wi-Fi.', 'Step 3: Network Transmission —'),
          bullet('The backend normalizes the UID, checks if a session is currently active, looks up the registered student in SQLite, and checks for prior scans in this session.', 'Step 4: Backend Processing & Verification —'),
          bullet('The backend inserts a record into the temporary "attendance_entries" table and broadcasts a "studentScanned" event through Socket.IO.', 'Step 5: Real-Time Event Broadcast —'),
          bullet('The teacher\'s browser receives the WebSocket event and immediately updates the live attendee list with a pulsing indicator and sound effect.', 'Step 6: Real-time UI Update —'),
          bullet('When the lecture finishes, the teacher clicks "Save Attendance". The server converts all scanned entries into permanent "Present" records and marks all non-scanned enrolled students as "Absent".', 'Step 7: Session Finalization —'),
          bullet('When students log in, the summary API aggregates total classes conducted, total classes attended, and dynamically calculates attendance percentages with visual color-coded badges.', 'Step 8: Student Analytics Update —'),

          heading2('2.2 Attendance Calculation & 75% Rule Engine'),
          paragraph(
            'Every completed attendance session increments the total class counter for that subject. The attendance percentage calculation is strictly deterministic:'
          ),
          bullet('Subject Attendance (%) = (Present Sessions / Total Sessions Conducted in Subject) × 100', 'Subject Formula:'),
          bullet('Overall Attendance (%) = (Total Present Across All Subjects / Total Classes Conducted Across All Subjects) × 100', 'Overall Formula:'),
          bullet('If Overall or Subject Attendance < 75%, the UI displays a danger alert (⚠️ Attendance Shortage Warning) informing the student that they are at risk of exam debarment.', 'Threshold Rule:'),

          // ==========================================
          // 3. WHAT IT USES TO DO IT (TECH STACK)
          // ==========================================
          heading1('3. WHAT IT USES TO DO IT (TECH STACK & HARDWARE)'),
          paragraph(
            'The system is built entirely on modern, reliable, and lightweight industry-standard technologies without unnecessary bloat.'
          ),

          heading2('3.1 Hardware Components'),
          createTable(
            ['Component', 'Specification / Model', 'Role in the System'],
            [
              ['Microcontroller', 'ESP8266 NodeMCU v3 (Wi-Fi Enabled)', 'Reads RFID data via SPI, connects to Wi-Fi, sends HTTP POST requests to backend.'],
              ['RFID Reader', 'MFRC522 13.56 MHz RFID Module', 'Contactless reader utilizing electromagnetic induction to read 1K Mifare cards/keyfobs.'],
              ['RFID Tags / Cards', 'Mifare Classic 1K RFID Cards (13.56 MHz)', 'Assigned to individual students; contains unique factory hardcoded UID.'],
              ['Power & Interfacing', 'Micro-USB Cable & Jumper Wires', 'Powers the ESP8266 and connects hardware SPI pins (SDA, SCK, MOSI, MISO, RST).']
            ]
          ),

          new Paragraph({ spacing: { before: 140 } }),

          heading3('Hardware Pinout / Circuit Connection Diagram'),
          createTable(
            ['RC522 Pin', 'ESP8266 NodeMCU Pin', 'Function / Description'],
            [
              ['SDA (SS)', 'D4 (GPIO 2) or D8 (GPIO 15)', 'SPI Chip Select / Slave Select line'],
              ['SCK', 'D5 (GPIO 14)', 'SPI Serial Clock line'],
              ['MOSI', 'D7 (GPIO 13)', 'SPI Master Out Slave In (Data transmission)'],
              ['MISO', 'D6 (GPIO 12)', 'SPI Master In Slave Out (Data reception)'],
              ['RST', 'D3 (GPIO 0)', 'Module Reset pin'],
              ['3.3V', '3.3V', 'Power supply (3.3V DC only — 5V can damage RC522)'],
              ['GND', 'GND', 'Common Ground']
            ]
          ),

          new Paragraph({ spacing: { before: 180 } }),

          heading2('3.2 Software Technologies & Frameworks'),
          createTable(
            ['Layer', 'Technology Used', 'Purpose & Key Capabilities'],
            [
              ['Frontend Framework', 'React 19 + Vite 6', 'Modern, ultra-fast single page reactive UI with client-side routing.'],
              ['Backend Runtime', 'Node.js + Express.js', 'High-performance asynchronous REST API server handling authentication, RFID scans, and sessions.'],
              ['Database', 'SQLite3 (sqlite3 driver)', 'Lightweight, self-contained, zero-configuration relational database with foreign key support.'],
              ['Real-Time WebSockets', 'Socket.IO (v4.8)', 'Bi-directional low-latency event communication between hardware scan endpoint and teacher UI.'],
              ['Security & Auth', 'JWT (JSON Web Tokens) & BCryptJS', 'Secure password hashing with salted rounds and stateless token-based authentication.'],
              ['Embedded Firmware', 'Arduino C++ (ESP8266HTTPClient + MFRC522)', 'Embedded firmware running on NodeMCU to poll RFID cards and dispatch HTTP requests.'],
              ['Styling System', 'Pure Vanilla CSS & Glassmorphism Design', 'Custom CSS variables, sleek dark and light cards, responsive grids, and micro-animations.']
            ]
          ),

          // ==========================================
          // 4. DATABASE ARCHITECTURE
          // ==========================================
          heading1('4. DATABASE ARCHITECTURE & SCHEMA DESIGN'),
          paragraph(
            'The relational database schema is designed to ensure strict data integrity, fast querying, and historical auditability.'
          ),

          createTable(
            ['Table Name', 'Key Fields', 'Description & Relationship'],
            [
              ['users', 'id, email, password_hash, role', 'Stores login credentials for students and teachers. Password secured via bcrypt.'],
              ['subjects', 'id, name', 'Curriculum subjects (e.g., MIS, IRS, STQA).'],
              ['students', 'id, user_id, college_id, name, department', 'Student demographic details, linked to users via user_id foreign key.'],
              ['teachers', 'id, user_id, name, subject_id', 'Teacher profiles linked to their designated subject via subject_id.'],
              ['rfid_cards', 'id, uid, student_id', 'Maps physical card UID hex strings to student records (UNIQUE constraint on UID).'],
              ['attendance_sessions', 'id, teacher_id, subject_id, session_date, status', 'Tracks live and past scanning sessions (status: scanning, completed, cancelled).'],
              ['attendance_entries', 'id, session_id, student_id, scanned_at', 'Temporary live scan entries while a session is active. Prevents double scans.'],
              ['attendance_records', 'id, session_id, student_id, subject_id, date, status', 'Finalized permanent record for each student in every class session (Present/Absent).']
            ]
          ),

          // ==========================================
          // 5. KEY API ENDPOINTS
          // ==========================================
          heading1('5. REST API & WEBSOCKET EVENT SPECIFICATION'),
          createTable(
            ['Endpoint', 'Method', 'Access Level', 'Description'],
            [
              ['/api/auth/login', 'POST', 'Public', 'Authenticates student or teacher; returns JWT token and user profile.'],
              ['/api/auth/me', 'GET', 'Bearer Token', 'Returns the profile of the currently logged-in user.'],
              ['/api/students/me/attendance/summary', 'GET', 'Student Only', 'Returns total classes, present count, overall %, and subject-wise breakdown.'],
              ['/api/students/me/attendance', 'GET', 'Student Only', 'Returns complete date-wise attendance history logs.'],
              ['/api/teachers/me', 'GET', 'Teacher Only', 'Fetches teacher subject info, active session status, and past session history.'],
              ['/api/attendance/start', 'POST', 'Teacher Only', 'Starts or resumes an active RFID scanning session for teacher\'s subject.'],
              ['/api/attendance/session/:id', 'GET', 'Teacher Only', 'Retrieves session metadata and live list of scanned students.'],
              ['/api/attendance/session/:id/cancel/:entryId', 'POST', 'Teacher Only', 'Cancels an erroneous scan entry in the active session.'],
              ['/api/attendance/session/:id/save', 'POST', 'Teacher Only', 'Finalizes session, writes Present/Absent records, and closes scanning.'],
              ['/api/rfid/scan', 'POST / ALL', 'Hardware / Simulator', 'Accepts RFID card UID, verifies student, saves temporary scan, and triggers WebSocket broadcast.']
            ]
          ),

          new Paragraph({ spacing: { before: 180 } }),

          heading2('5.1 Real-Time WebSocket Events (Socket.IO)'),
          bullet('Emitted when ESP8266 scans a card. Transmits student name, college ID, department, and scan timestamp to live teacher radar screen.', '• studentScanned:'),
          bullet('Emitted when teacher clicks cancel on a scanned student entry. Removes the entry from all connected teacher viewports.', '• entryCancelled:'),
          bullet('Emitted when teacher saves attendance. Updates session status to completed and displays confirmation.', '• sessionSaved:'),
          bullet('Broadcasted to all student connections so student dashboards automatically refresh their summary percentages.', '• attendanceUpdated:'),

          // ==========================================
          // 6. CONCLUSION
          // ==========================================
          heading1('6. CONCLUSION & FUTURE SCOPE'),
          paragraph(
            'The RFID Attendance Management System represents a robust, highly scalable, and production-ready academic IoT solution. By combining cost-effective microcontrollers with high-speed WebSockets and reactive interfaces, it eliminates classroom proxy attendance, provides instant feedback to faculty, and keeps students transparently informed about their attendance compliance.'
          ),
          paragraph(
            'Future enhancements can include SMS/Email alerts to parents when a student falls below 75%, biometric multi-factor authentication, and automated timetable scheduling integration.'
          )
        ]
      }
    ]
  });

  const outputPath = path.resolve(__dirname, '../../RFID_Attendance_System_Documentation.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log('Word Document successfully created at:', outputPath);
}

generateDocumentation().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
