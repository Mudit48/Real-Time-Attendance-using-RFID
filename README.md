# RFID Attendance Management System

A complete full-stack college project connecting a modern attendance web application with an **ESP8266 NodeMCU** microcontroller and **MFRC522 RFID reader**.

---

## 📌 Project Overview
The **RFID Attendance Management System** provides an automated, tamper-resistant method for recording college classroom attendance. Students tap their RFID card or smart identity badge on an ESP8266-connected reader during a faculty-initiated attendance session. Attendance entries are captured, validated against duplicate scans, broadcast live via **Socket.IO** to the teacher's scanning screen, and permanently stored in a lightweight **SQLite** database.

---

## 🏗️ System Architecture

```text
[ Physical RFID Card ]
        │ Tap
        ▼
[ MFRC522 RFID Reader ]
        │ SPI
        ▼
[ ESP8266 NodeMCU ] ──── Wi-Fi (HTTP POST /api/rfid/scan) ────┐
                                                              ▼
                                                   [ Node.js + Express Server ]
                                                   ├── JWT Auth & Role Guard
                                                   ├── SQLite Database (attendance.db)
                                                   └── Socket.IO Real-time Engine
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    │                                                                                   │
             WebSocket broadcast                                                                 WebSocket broadcast
              ('studentScanned')                                                                ('attendanceUpdated')
                    │                                                                                   │
                    ▼                                                                                   ▼
       [ Teacher Scanning Dashboard ]                                                      [ Student Portal Dashboard ]
      - Live scanned list                                                                 - Overall % (e.g. 82%)
      - Cancel invalid entries                                                            - Subject stats (MIS, IRS, STQA)
      - Finalize & Save attendance                                                        - Bar graph analytics
                                                                                          - Full attendance history
```

---

## 🗂️ Project Directory Structure

```text
rfid-attendance/
├── client/                     # React + Vite Frontend (JavaScript)
│   ├── src/
│   │   ├── components/         # Navbar, ProtectedRoute, BarChart
│   │   ├── context/            # AuthContext (JWT, Login, Logout, Register)
│   │   ├── pages/              # Login, Register, StudentDashboard, TeacherDashboard, TeacherScan
│   │   ├── App.jsx             # React Router route definitions
│   │   ├── index.css           # Modern design system (CSS variables, cards, badges)
│   │   └── main.jsx
│   ├── vite.config.js          # Vite config with API & WebSocket proxy
│   └── package.json
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── database/           # db.js (SQLite wrapper), schema.js, seed.js
│   │   ├── middleware/         # auth.js (JWT authentication & role checks)
│   │   ├── routes/             # auth.js, students.js, teachers.js, attendance.js, rfid.js
│   │   ├── socket.js           # Socket.IO broadcaster
│   │   └── config.js           # Configuration constants
│   ├── test_e2e.js             # Automated end-to-end API test suite
│   ├── server.js               # Main server entrypoint (Port 5000)
│   └── package.json
├── database/                   # SQLite database storage
│   └── attendance.db           # SQLite database file
├── esp8266/                    # Microcontroller Firmware
│   └── nodemcu_rfid.ino        # Ready-to-flash Arduino sketch for NodeMCU + MFRC522
├── package.json                # Root convenience scripts
└── README.md                   # Full documentation
```

---

## ⚙️ Quick Start & Installation

### Prerequisites
- **Node.js** (v18, v20, or v22 recommended)
- **npm** (v9 or v10)

### 1. Database Setup & Seeding
From the `server` directory:
```bash
cd server
npm install
npm run seed
```
> This creates `database/attendance.db`, builds all 8 tables, and seeds the 3 subjects, 3 teachers, 4 sample students, RFID card mappings, and historical attendance records.

### 2. Run Backend Server
```bash
cd server
npm run dev
```
- Server will run on: **http://localhost:5000**
- Healthcheck endpoint: **http://localhost:5000/api/health**

### 3. Run Frontend Client
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
- Frontend will open on: **http://localhost:5173**

---

## 👥 Predefined Test Accounts

### 👨‍🏫 Teacher Accounts
Each teacher is assigned **exactly one** subject.

| Teacher Name | Email / Username | Password | Assigned Subject |
| :--- | :--- | :--- | :--- |
| **Teacher MIS** | `mis@college.com` | `teacher123` | **MIS** |
| **Teacher IRS** | `irs@college.com` | `teacher123` | **IRS** |
| **Teacher STQA** | `stqa@college.com` | `teacher123` | **STQA** |

### 🎓 Sample Student Accounts

| Student Name | College ID | Department | Email | Password | RFID UID Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mudit Meshram** | `202303034` | Information Technology | `student@example.com` | `student123` | `80:88:60:2A` |
| **Rishabh Kanojiya** | `202303035` | Information Technology | `rishabh@example.com` | `student123` | `7C:3E:7E:B0` |
| **Atharva Ghorpade** | `202303036` | Information Technology | `atharva@example.com` | `student123` | `CC:BD:CD:B0` |
| **Siddhi Jadhav** | `202303037` | Information Technology | `siddhi@example.com` | `student123` | `42:C5:56:D9` |

> 💡 **Quick Login Tip:** On the login page (`http://localhost:5173/login`), click the quick demo buttons (e.g. `🎓 Student (Mudit)` or `👨‍🏫 Teacher MIS`) to instantly populate credentials.

---

## 📡 RFID UID Card Mappings in Database
RFID cards are mapped in the `rfid_cards` table in SQLite:

- `80:88:60:2A` ➔ **Mudit Meshram** (College ID: `202303034`)
- `7C:3E:7E:B0` ➔ **Rishabh Kanojiya** (College ID: `202303035`)
- `CC:BD:CD:B0` ➔ **Atharva Ghorpade** (College ID: `202303036`)
- `42:C5:56:D9` ➔ **Siddhi Jadhav** (College ID: `202303037`)

---

## 🔄 Attendance Workflow

1. **Teacher Starts Session**:
   - Teacher logs in and clicks **`[ Start Scan ]`**.
   - Backend creates an active attendance session in `attendance_sessions` with `status = 'scanning'` for the teacher's assigned subject.
2. **Student Card Tapping**:
   - ESP8266 reads RFID UID and sends `POST /api/rfid/scan` with `{"uid": "80:88:60:2A"}`.
   - Backend checks:
     1. Is there an active scanning session? (If not, returns `"No active attendance session"`).
     2. Does the UID exist in `rfid_cards`? (If not, returns `"RFID card not registered"`).
     3. Has the student already scanned during this session? (If yes, returns `"Student already scanned."`).
   - If valid, a temporary record is added to `attendance_entries` and a `studentScanned` event is broadcast via Socket.IO.
3. **Live Teacher Screen**:
   - Scanned students appear immediately on the teacher's screen without page refresh.
   - The teacher can click **`[Cancel]`** on an entry to remove an erroneous or accidental scan.
4. **Finalizing Attendance**:
   - Teacher clicks **`[ SAVE ATTENDANCE ]`**.
   - Session status changes to `'completed'`.
   - **All registered students** receive a permanent record in `attendance_records`:
     - Scanned students ➔ **`Present`**
     - Non-scanned students ➔ **`Absent`**
   - Socket.IO broadcasts `attendanceUpdated`. Any student currently viewing their dashboard immediately sees their updated attendance figures without refreshing!

---

## 🔌 ESP8266 NodeMCU & MFRC522 Hardware Wiring

The complete sketch is located in [`esp8266/nodemcu_rfid.ino`](./esp8266/nodemcu_rfid.ino).

| MFRC522 Pin | NodeMCU Pin | Pin Function |
| :--- | :--- | :--- |
| **3.3V** | **3V3** | 3.3V Power (Do NOT use 5V) |
| **RST** | **D3** (GPIO 0) | Reset |
| **GND** | **GND** | Ground |
| **MISO** | **D6** (GPIO 12) | SPI MISO |
| **MOSI** | **D7** (GPIO 13) | SPI MOSI |
| **SCK** | **D5** (GPIO 14) | SPI Clock |
| **SDA (SS)** | **D4** (GPIO 2) | SPI Chip Select |
| **Buzzer (+)** | **D1** (GPIO 5) | Audio feedback (Optional) |

### NodeMCU HTTP Request Example
```http
POST /api/rfid/scan HTTP/1.1
Host: 192.168.1.100:5000
Content-Type: application/json

{
  "uid": "80:88:60:2A"
}
```

---

## 🧪 Testing Without Hardware (Software Simulator)
During demonstrations or evaluation when the physical NodeMCU is not connected:
1. Open the teacher scanning page (`/teacher/scan`).
2. The built-in **NodeMCU RFID Test Simulator** on the right side provides one-click buttons for each sample student card, plus an input field for custom UIDs.
3. Clicking any card button triggers the exact `POST /api/rfid/scan` endpoint and verifies all backend validation and live Socket.IO events.

To run the automated test suite verifying all 13 API endpoints:
```bash
cd server
node test_e2e.js
```

---

## 📚 REST API Reference

### Authentication
- `POST /api/auth/register` — Student sign up (validates unique College ID & email).
- `POST /api/auth/login` — Student or teacher sign in (returns JWT token).
- `POST /api/auth/logout` — Sign out.
- `GET /api/auth/me` — Retrieve authenticated user profile.

### Student
- `GET /api/students/me` — Student personal information.
- `GET /api/students/me/attendance` — Complete attendance history table.
- `GET /api/students/me/attendance/summary` — Overall % and subject-wise breakdown (MIS, IRS, STQA).

### Teacher
- `GET /api/teachers/me` — Teacher info, assigned subject, and recent sessions.
- `POST /api/attendance/start` — Start a new attendance session.
- `GET /api/attendance/session/:id` — Get live session status and scanned students.
- `POST /api/attendance/session/:id/cancel/:entryId` — Cancel temporary scanned entry.
- `POST /api/attendance/session/:id/save` — Finalize session and calculate Present/Absent.

### RFID
- `POST /api/rfid/scan` — RFID scan tap endpoint (used by NodeMCU).
- `GET /api/rfid/registered-cards` — List registered RFID cards for reference.

---

## 🛡️ Security Best Practices Implemented
- Passwords hashed using **bcrypt** with 10 salt rounds.
- Stateless authentication using **JSON Web Tokens (JWT)**.
- Strict **Role-Based Access Control (RBAC)** preventing students from accessing teacher actions and vice versa.
- Student identities are resolved directly from database session tokens, never trusting client-submitted identifiers.
