# 🚀 FocusFlow | Student Pomodoro & Task Manager

FocusFlow is a high-conversion Pomodoro tool designed to help students enter "Deep Work" states while naturally encouraging user registration through session-saving and analytics.

## 🛠️ Tech Stack
- **Frontend:** Vanilla JavaScript, CSS3 (Modern Focus UI), HTML5.
- **Backend:** Express.js (v5), Node.js, TypeScript.
- **Database:** SQLite (Local persistent storage).
- **Growth Engine:** `canvas-confetti` for rewards, Social Share Intent API for virality.

## 📦 Key Features
- **Distraction-Free Timer:** 25/5m cycles with browser tab synchronization.
- **Task Management:** Local task lists with persistent Pomodoro counters per task.
- **Cloud Sync Hook:** Email-based registration that backs up local data to the server.
- **Deep Work Mode:** Visual UI transitions that dim the screen during focus sessions.

## 🚀 Getting Started
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run in Development:**
   ```bash
   npm start
   ```
3. **Access the App:**
   Open [http://localhost:3001](http://localhost:3001)

## 📁 Architecture
- `/server/index.ts`: Secure API endpoints and database initialization.
- `/app.js`: Core timer logic, task management, and API integration.
- `/style.css`: Modern, responsive "Focus-Mode" styling.
- `database.sqlite`: Persistent storage for student emails and task data.

## 📈 Growth Strategy
1. **Utility First:** Provide value (timer + tasks) before asking for any data.
2. **Sunk Cost:** Let students build up a history (🍅 counts) so they feel motivated to "save" it.
3. **Viral Loops:** Prompt sharing immediately after the "Cloud Sync" event.

---
Built with ❤️ for students.
