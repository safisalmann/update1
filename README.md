# MedQuiz Prep — Medical Admission MCQ Preparation System

A premium, fully offline-capable single-page application (SPA) for students preparing for Medical Admission Tests (MAT) in Bangladesh.

---

## 🌟 Features

- **5 Exam Modes:** Chapterwise, Paperwise, Subjectwise, MAT Mock Simulation, and Custom Prep
- **Negative Marking:** Toggle -0.25 per wrong answer (configurable globally or per-test)
- **308 Seed Questions:** Real Biology 1st Paper MCQs compiled from the MedMaster Question Bank
- **⚠️ Question Reporting System:** Students can report 7 types of issues per question
- **🔔 Discord/Slack Webhook Alerts:** Get instant push notifications when questions are reported — zero server required!
- **🛠️ Developer Panel:** View all reports, mark resolved, configure webhooks, and parse new questions from documents
- **📋 Docs Parser:** Paste Bangla MCQ text and instantly generate a formatted database entry
- **🏆 Achievements & Gamification:** Streaks, XP system, badges, and a mock leaderboard
- **🌙 Dark/Light Mode:** Smooth animated theme toggle
- **Responsive Design:** Works on tablets, laptops, and desktops

---

## 📦 Project Structure

```
medquiz-prep/
├── index.html          # App entry point & HTML structure
├── styles.css          # Premium glassmorphic design system
├── app.js              # SPA router, quiz engine, developer panel
├── store.js            # localStorage state manager with reporting & webhook
├── questions_db.js     # 308 compiled MCQ questions (Biology P1 Ch1)
└── server.ps1          # Zero-dependency PowerShell local static server
```

---

## 🚀 Running Locally

Since the app uses ES6 modules, it **must be served over HTTP** (not opened directly as a file). A zero-dependency PowerShell server is included:

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

Then open your browser and go to: **`http://localhost:8080/`**

---

## 🔔 Setting Up Webhook Alerts (Discord / Slack)

1. Go to **Developer Panel → Webhook Settings** in the sidebar.
2. Paste your **Discord** or **Slack Incoming Webhook URL**.
3. Click **💾 Save Webhook**, then **🧪 Send Test Alert** to verify.
4. When any student reports a question online, you'll receive an instant rich notification card!

**Getting a Discord webhook URL:**
> Server Settings → Integrations → Webhooks → New Webhook → Copy URL

---

## ⚠️ Report Categories

When students click the **⚠️ Report** button on any question, they can choose from:

| # | Category | Description |
|---|---|---|
| 1 | **Wrong Answer** | The marked correct answer is incorrect |
| 2 | **No Answer** | No correct answer exists among the options |
| 3 | **Incorrect Question** | The question itself is flawed or unclear |
| 4 | **Typing Mistake** | Spelling or typographical error in the text |
| 5 | **Question Fabricated/Unfound** | Cannot be found in any reference |
| 6 | **Wrong Reference** | Source/reference is incorrect or misattributed |
| 7 | **Wrong Solution/Explanation** | The explanation or solution is incorrect |

---

## 📋 Adding New Questions

Use the **Developer Panel → Docs Parser** tab. Paste question text in this format:

```
০১। মানবদেহের দীর্ঘতম কোষ কোনটি? [MAT: 24-25]
* (a) মায়োসাইট
* (b) স্পার্মাটোসাইট
* (c) নিউরন
* (d) ওভাম
* উত্তরঃ (c)
* ব্যাখ্যা: দীর্ঘতম কোষ মটর নিউরন যা প্রায় ১.৩৭ মিটার লম্বা।
```

---

## 🌐 Deployment

The app is a completely static website — it can be deployed to:
- **GitHub Pages** (free)
- **Netlify** (free, drag & drop deploy)
- **Vercel** (free)
- Any standard static file hosting

No backend or database required!

---

## License

MIT — Free to use and modify for educational purposes.
