// app.js - Main Application Engine for MedQuiz Prep

import { questionsDatabase } from './questions_db.js';
import { store, REPORT_CATEGORIES } from './store.js';

// ── Toast notification helper ──────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// Application State
const state = {
  currentView: 'dashboard',
  quiz: {
    questions: [],
    currentIndex: 0,
    answers: [],
    skipped: [],
    timeRemaining: 0,
    totalDuration: 0,
    timerInterval: null,
    config: null
  },
  tempConfig: null,
  tempParsed: null,
  // Report modal state
  report: {
    questionIndex: null,   // index in quiz.questions when reporting mid-exam
    questionData: null     // full question object
  }
};

// ── Subjects Chapter Config ────────────────────────────────────────────────
const CHAPTERS_MAPPING = {
  biology: {
    name: "Biology (জীববিজ্ঞান)",
    papers: {
      1: { code: "B1", count: 12, name: "Biology 1st Paper (উদ্ভিদবিজ্ঞান)" },
      2: { code: "B2", count: 12, name: "Biology 2nd Paper (প্রাণীবিজ্ঞান)" }
    }
  },
  chemistry: {
    name: "Chemistry (রসায়ন)",
    papers: {
      1: { code: "C1", count: 5, name: "Chemistry 1st Paper" },
      2: { code: "C2", count: 5, name: "Chemistry 2nd Paper" }
    }
  },
  physics: {
    name: "Physics (পদার্থবিজ্ঞান)",
    papers: {
      1: { code: "P1", count: 10, name: "Physics 1st Paper" },
      2: { code: "P2", count: 11, name: "Physics 2nd Paper" }
    }
  },
  english: {
    name: "English (ইংরেজি)",
    papers: { null: { code: "E", count: 8, name: "General English Syllabus" } }
  },
  gk: {
    name: "General Knowledge (সাধারণ জ্ঞান)",
    papers: { null: { code: "G", count: 6, name: "GK - History, War & Geo" } }
  }
};

// ── Router & Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderStats();
  initReportModal();
  updateNavReportBadge();

  window.addEventListener('hashchange', router);
  router();

  document.getElementById('start-quiz-btn').addEventListener('click', onStartQuizFromModal);
});

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const storedTheme = localStorage.getItem('medquiz_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', storedTheme);
  toggleBtn.innerHTML = storedTheme === 'dark' ? '☀️' : '🌙';
  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('medquiz_theme', target);
    toggleBtn.innerHTML = target === 'dark' ? '☀️' : '🌙';
  });
}

function initHeaderStats() {
  document.getElementById('header-streak').textContent = store.stats.streak;
  document.getElementById('header-xp').textContent = store.stats.totalXP;
}

function updateHeaderStats() { initHeaderStats(); }

function updateNavReportBadge() {
  const badge = document.getElementById('nav-report-badge');
  if (!badge) return;
  const count = store.getUnresolvedReportCount();
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ── Report Modal Initialization ────────────────────────────────────────────
function initReportModal() {
  // Build category radio list from REPORT_CATEGORIES
  const listEl = document.getElementById('report-category-list');
  if (!listEl) return;

  listEl.innerHTML = REPORT_CATEGORIES.map(cat => `
    <div>
      <input type="radio" class="report-category-radio" name="report-cat" id="rcat-${cat.id}" value="${cat.id}">
      <label class="report-category-label" for="rcat-${cat.id}">
        <span class="report-cat-icon">${cat.icon}</span>
        <span class="report-cat-info">
          <span class="report-cat-label">${cat.label}</span>
          <span class="report-cat-desc">${cat.desc}</span>
        </span>
      </label>
    </div>
  `).join('');

  // Close modal
  document.getElementById('report-modal-close').addEventListener('click', closeReportModal);
  document.getElementById('report-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('report-modal')) closeReportModal();
  });

  // Submit
  document.getElementById('report-submit-btn').addEventListener('click', onSubmitReport);
}

function openReportModal(questionData) {
  state.report.questionData = questionData;

  // Reset form
  document.querySelectorAll('input[name="report-cat"]').forEach(r => r.checked = false);
  document.getElementById('report-comment').value = '';
  document.getElementById('report-success-msg').style.display = 'none';
  document.getElementById('report-submit-btn').style.display = 'block';

  // Show preview
  document.getElementById('report-question-preview').textContent = questionData.question;

  document.getElementById('report-modal').style.display = 'flex';
}

function closeReportModal() {
  document.getElementById('report-modal').style.display = 'none';
  state.report.questionData = null;
}

async function onSubmitReport() {
  const selected = document.querySelector('input[name="report-cat"]:checked');
  if (!selected) {
    showToast('Please select a problem category first.', 'error');
    return;
  }

  const q = state.report.questionData;
  const comment = document.getElementById('report-comment').value.trim();

  const report = store.addReport({
    questionId:   q.id || ('q_' + Date.now()),
    questionText: q.question,
    subject:      q.subject || 'N/A',
    paper:        q.paper   || null,
    chapter:      q.chapter || null,
    categoryId:   selected.value,
    comment:      comment
  });

  // Hide submit, show success message
  document.getElementById('report-submit-btn').style.display = 'none';
  document.getElementById('report-success-msg').style.display = 'block';

  // Update sidebar badge
  updateNavReportBadge();
  showToast('Report submitted! Thank you 🙏', 'success');

  // Attempt webhook notification (silently)
  const webhookResult = await store.sendWebhookAlert(report);
  if (!webhookResult.success && store.getWebhook()) {
    console.warn('Webhook delivery failed:', webhookResult.reason || webhookResult.status);
  }

  // Auto-close after 2 seconds
  setTimeout(closeReportModal, 2000);
}

// ── Router ─────────────────────────────────────────────────────────────────
function router() {
  const hash = window.location.hash || '#dashboard';
  const slot = document.getElementById('main-view-slot');
  const viewTitle = document.getElementById('view-title');

  if (state.quiz.timerInterval) {
    clearInterval(state.quiz.timerInterval);
    state.quiz.timerInterval = null;
  }

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const cleanHash = hash.split('?')[0];
  const sidebarEl = document.getElementById('nav-' + cleanHash.replace('#', ''));
  if (sidebarEl) sidebarEl.classList.add('active');

  switch (cleanHash) {
    case '#dashboard':    viewTitle.textContent = "Dashboard";                  renderDashboard(slot);    break;
    case '#chapterwise':  viewTitle.textContent = "Chapterwise Preparation";    renderChapterwise(slot);  break;
    case '#paperwise':    viewTitle.textContent = "Paperwise Preparation";      renderPaperwise(slot);    break;
    case '#subjectwise':  viewTitle.textContent = "Subjectwise Preparation";    renderSubjectwise(slot);  break;
    case '#mat-prep':     viewTitle.textContent = "MAT Mock Preparation";       renderMATPrep(slot);      break;
    case '#custom-prep':  viewTitle.textContent = "Custom Preparation";         renderCustomPrep(slot);   break;
    case '#achievements': viewTitle.textContent = "Your Achievements";          renderAchievements(slot); break;
    case '#developer':    viewTitle.textContent = "Developer Panel";            renderDeveloper(slot);    break;
    default:              viewTitle.textContent = "Dashboard";                  renderDashboard(slot);
  }
}

// ── VIEW RENDERERS ─────────────────────────────────────────────────────────

function renderDashboard(slot) {
  const stats = store.stats;
  const historyCount = stats.examHistory.length;
  const averageAccuracy = historyCount > 0
    ? Math.round(stats.examHistory.reduce((acc, h) => acc + h.accuracy, 0) / historyCount) : 0;

  slot.innerHTML = `
    <div class="dashboard-grid">
      <div style="display: flex; flex-direction: column; gap: 30px;">
        <div class="dashboard-hero">
          <div class="hero-tag">MEDICAL ADMISSION PORTAL</div>
          <h2 class="hero-title">Prepare Smarter for Medical Admission</h2>
          <p class="hero-desc">Take randomized chapterwise preparation tests, full-syllabus medical mocks, and custom examinations with optional negative markings (-0.25) to maximize your score.</p>
        </div>

        <div class="global-settings-bar">
          <div class="settings-label">
            <span class="settings-title">Negative Marking Toggle (-0.25)</span>
            <span class="settings-desc">Enable global penalty of -0.25 marks per wrong answer for practice tests</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="dashboard-neg-toggle" ${stats.settings.negativeMarking ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <h3 class="prep-modes-title">Choose Preparation Type</h3>
        <div class="prep-grid">
          <div class="prep-card" onclick="window.location.hash='#chapterwise'">
            <div class="prep-icon">📖</div>
            <div class="prep-name">Chapterwise</div>
            <div class="prep-card-desc">Practice specific chapters in Biology, Chemistry, and Physics.</div>
            <div class="prep-action">Start Chapter →</div>
          </div>
          <div class="prep-card" onclick="window.location.hash='#paperwise'">
            <div class="prep-icon">📄</div>
            <div class="prep-name">Paperwise</div>
            <div class="prep-card-desc">Prepare using entire single papers (e.g. Physics 1st Paper).</div>
            <div class="prep-action">Select Paper →</div>
          </div>
          <div class="prep-card" onclick="window.location.hash='#subjectwise'">
            <div class="prep-icon">🧬</div>
            <div class="prep-name">Subjectwise</div>
            <div class="prep-card-desc">Practice entire subjects (e.g., General Knowledge or Biology).</div>
            <div class="prep-action">Select Subject →</div>
          </div>
          <div class="prep-card" onclick="window.location.hash='#mat-prep'">
            <div class="prep-icon">🔬</div>
            <div class="prep-name">MAT Mock Test</div>
            <div class="prep-card-desc">Full standard mock with real Medical admission distributions.</div>
            <div class="prep-action">Start Exam →</div>
          </div>
        </div>
      </div>

      <div class="stats-widget">
        <h4 class="widget-title">Your Progress Metrics</h4>
        <div class="stats-circle-container">
          <svg class="circle-progress-svg" width="120" height="120">
            <circle class="circle-progress-bg" cx="60" cy="60" r="50"></circle>
            <circle class="circle-progress-bar" cx="60" cy="60" r="50" style="stroke: var(--accent); stroke-dashoffset: ${283 - (283 * averageAccuracy / 100)};"></circle>
            <text class="circle-text" x="60" y="65" text-anchor="middle" font-size="18" fill="var(--text-main)" transform="rotate(90 60 60)">${averageAccuracy}%</text>
          </svg>
        </div>
        <div style="text-align: center; font-size: 13px; color: var(--text-muted); font-weight: 600; margin-top: -10px;">Overall Practice Accuracy</div>
        <div class="stats-bar-list">
          <div class="stat-bar-item"><span class="stat-bar-name">Exams Completed</span><span class="stat-bar-val">${stats.testsCompleted}</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Questions Solved</span><span class="stat-bar-val">${stats.questionsAttempted}</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Correct Answers</span><span class="stat-bar-val" style="color: var(--accent);">${stats.correctAnswers}</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Current Streak</span><span class="stat-bar-val" style="color: var(--warning);">${stats.streak} Days</span></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('dashboard-neg-toggle').addEventListener('change', (e) => {
    store.updateSettings({ negativeMarking: e.target.checked });
  });
}

function renderChapterwise(slot) {
  slot.innerHTML = `
    <div class="subject-header">
      <h2>Select Subject</h2>
      <p style="color: var(--text-muted); margin-top: 6px;">Select a subject and paper to view available chapters</p>
    </div>
    <div class="subject-grid" id="subject-cards-grid">
      <div class="subject-card">
        <div class="subject-info">
          <div class="prep-icon" style="background: rgba(16,185,129,0.1); color: rgb(16,185,129);">🌱</div>
          <div><div class="subject-title">Biology</div><div class="subject-meta">1st & 2nd Paper (12+12 Chapters)</div></div>
        </div>
        <div class="paper-selector">
          <button class="paper-btn" onclick="app.showChapters('biology', 1)">1st Paper (B1)</button>
          <button class="paper-btn" onclick="app.showChapters('biology', 2)">2nd Paper (B2)</button>
        </div>
      </div>
      <div class="subject-card">
        <div class="subject-info">
          <div class="prep-icon" style="background: rgba(59,130,246,0.1); color: rgb(59,130,246);">🧪</div>
          <div><div class="subject-title">Chemistry</div><div class="subject-meta">1st & 2nd Paper (5+5 Chapters)</div></div>
        </div>
        <div class="paper-selector">
          <button class="paper-btn" onclick="app.showChapters('chemistry', 1)">1st Paper (C1)</button>
          <button class="paper-btn" onclick="app.showChapters('chemistry', 2)">2nd Paper (C2)</button>
        </div>
      </div>
      <div class="subject-card">
        <div class="subject-info">
          <div class="prep-icon" style="background: rgba(239,68,68,0.1); color: rgb(239,68,68);">⚡</div>
          <div><div class="subject-title">Physics</div><div class="subject-meta">1st & 2nd Paper (10+11 Chapters)</div></div>
        </div>
        <div class="paper-selector">
          <button class="paper-btn" onclick="app.showChapters('physics', 1)">1st Paper (P1)</button>
          <button class="paper-btn" onclick="app.showChapters('physics', 2)">2nd Paper (P2)</button>
        </div>
      </div>
    </div>
    <div id="chapters-view-box" style="margin-top: 50px; display: none;">
      <div class="subject-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 id="chapters-title" style="font-size: 20px;">Chapters</h3>
          <p id="chapters-desc" style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Choose a chapter to practice</p>
        </div>
        <button class="btn-secondary" onclick="app.backToSubjects()">Back to Subjects</button>
      </div>
      <div class="chapters-container" id="chapters-grid-slot"></div>
    </div>
  `;
}

function renderPaperwise(slot) {
  slot.innerHTML = `
    <div class="subject-header"><h2>Select Exam Paper</h2><p style="color: var(--text-muted); margin-top: 6px;">Practice all chapters combined for a single paper</p></div>
    <div class="subject-grid">
      <div class="subject-card">
        <div class="subject-info"><div class="prep-icon">🌱</div><div class="subject-title">Biology (জীববিজ্ঞান)</div></div>
        <div class="paper-selector" style="flex-direction: column; gap: 8px;">
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('biology', 1)">Biology 1st Paper (B1)</button>
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('biology', 2)">Biology 2nd Paper (B2)</button>
        </div>
      </div>
      <div class="subject-card">
        <div class="subject-info"><div class="prep-icon">🧪</div><div class="subject-title">Chemistry (রসায়ন)</div></div>
        <div class="paper-selector" style="flex-direction: column; gap: 8px;">
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('chemistry', 1)">Chemistry 1st Paper (C1)</button>
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('chemistry', 2)">Chemistry 2nd Paper (C2)</button>
        </div>
      </div>
      <div class="subject-card">
        <div class="subject-info"><div class="prep-icon">⚡</div><div class="subject-title">Physics (পদার্থবিজ্ঞান)</div></div>
        <div class="paper-selector" style="flex-direction: column; gap: 8px;">
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('physics', 1)">Physics 1st Paper (P1)</button>
          <button class="paper-btn" style="text-align: left; padding: 14px;" onclick="app.configurePaperQuiz('physics', 2)">Physics 2nd Paper (P2)</button>
        </div>
      </div>
    </div>
  `;
}

function renderSubjectwise(slot) {
  slot.innerHTML = `
    <div class="subject-header"><h2>Select Subject</h2><p style="color: var(--text-muted); margin-top: 6px;">Test your knowledge in a complete subject</p></div>
    <div class="subject-grid">
      ${[
        { key: 'biology',   icon: '🌱', color: '16,185,129', title: 'Biology',  meta: 'Both Papers (24 Chapters)' },
        { key: 'chemistry', icon: '🧪', color: '59,130,246', title: 'Chemistry', meta: 'Both Papers (10 Chapters)' },
        { key: 'physics',   icon: '⚡', color: '239,68,68',  title: 'Physics',   meta: 'Both Papers (21 Chapters)' },
        { key: 'english',   icon: '📝', color: '99,102,241', title: 'English',   meta: 'Parts of Speech, Synonyms, Grammar' },
        { key: 'gk',        icon: '🌎', color: '245,158,11', title: 'General Knowledge', meta: 'History of BD, Liberation War' }
      ].map(s => `
        <div class="subject-card" onclick="app.configureSubjectQuiz('${s.key}')" style="cursor: pointer;">
          <div class="subject-info">
            <div class="prep-icon" style="background: rgba(${s.color},0.1); color: rgb(${s.color});">${s.icon}</div>
            <div><div class="subject-title">${s.title}</div><div class="subject-meta">${s.meta}</div></div>
          </div>
          <div class="prep-action">Configure Test →</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMATPrep(slot) {
  slot.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
      <div class="dashboard-hero" style="background: linear-gradient(135deg, #065f46, #064e3b);">
        <div class="hero-tag">OFFICIAL SIMULATION MOCK</div>
        <h2 class="hero-title">Medical Admission Test (MAT) Simulation</h2>
        <p class="hero-desc">Experience a realistic full-length model test based on standard medical admission test ratios. Includes negative markings (-0.25) by default.</p>
      </div>
      <div class="stats-widget" style="padding: 30px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px;">Model Test Specifications</h3>
        <div class="stats-bar-list">
          <div class="stat-bar-item"><span class="stat-bar-name">Total Exam Questions</span><span class="stat-bar-val">100 Questions</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Total Time Limit</span><span class="stat-bar-val">60 Minutes</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Syllabus Breakdown</span><span class="stat-bar-val" style="font-size: 14px; font-weight: normal; color: var(--text-muted); text-align: right;">Biology (30) • Chemistry (25) • Physics (20) • English (15) • GK (10)</span></div>
          <div class="stat-bar-item"><span class="stat-bar-name">Negative Marking State</span><span class="stat-bar-val" style="color: var(--danger);">Enabled (-0.25 per wrong)</span></div>
        </div>
        <button class="btn-primary" style="margin-top: 15px; padding: 16px;" onclick="app.startMATMock()">Start MAT Model Simulation</button>
      </div>
    </div>
  `;
}

function renderCustomPrep(slot) {
  slot.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
      <div class="subject-header"><h2>Create Custom Exam</h2><p style="color: var(--text-muted); margin-top: 6px;">Select custom subjects, question numbers, and timer configs</p></div>
      <div class="stats-widget" style="gap: 20px;">
        <div class="form-group">
          <label class="form-label">1. Choose Subjects to Include</label>
          <div class="checkbox-grid">
            <label class="checkbox-label"><input type="checkbox" name="custom-subject" value="biology" checked> Biology</label>
            <label class="checkbox-label"><input type="checkbox" name="custom-subject" value="chemistry" checked> Chemistry</label>
            <label class="checkbox-label"><input type="checkbox" name="custom-subject" value="physics" checked> Physics</label>
            <label class="checkbox-label"><input type="checkbox" name="custom-subject" value="english"> English</label>
            <label class="checkbox-label"><input type="checkbox" name="custom-subject" value="gk"> General Knowledge</label>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label class="form-label">2. Select Question Count</label>
            <select class="form-select" id="custom-q-count">
              <option value="10">10 Questions</option>
              <option value="25" selected>25 Questions</option>
              <option value="50">50 Questions</option>
              <option value="100">100 Questions</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">3. Select Timer Duration</label>
            <select class="form-select" id="custom-time">
              <option value="5">5 Minutes</option>
              <option value="15" selected>15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="flex-direction: row; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid var(--border-color); margin-top: 10px;">
          <label class="form-label" style="display: flex; flex-direction: column;">
            <span>Negative Marking Enabled</span>
            <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">-0.25 deduction per wrong answer</span>
          </label>
          <label class="switch">
            <input type="checkbox" id="custom-neg-toggle" ${store.stats.settings.negativeMarking ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <button class="btn-primary" style="padding: 16px;" onclick="app.startCustomQuiz()">Start Custom Test</button>
      </div>
    </div>
  `;
}

function renderAchievements(slot) {
  const achievements = store.getAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  slot.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 30px;">
      <div class="subject-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2>Aspirant Badges</h2>
          <p style="color: var(--text-muted); margin-top: 6px;">Complete milestones and earn reward XP!</p>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: var(--accent); background: var(--accent-glow); padding: 8px 16px; border-radius: 12px;">${unlockedCount} / ${achievements.length} Unlocked</div>
      </div>
      <div class="achievements-grid">
        ${achievements.map(a => `
          <div class="achievement-card ${a.unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
            <div class="achievement-info">
              <span class="achievement-title">${a.title}</span>
              <span class="achievement-desc">${a.desc}</span>
              <span class="achievement-xp">+${a.xp} XP</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 30px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px;">Monthly Leaderboard</h3>
        <div class="leaderboard-list">
          ${store.getLeaderboard().map(user => `
            <div class="leaderboard-item ${user.name === 'You' ? 'user-row' : ''}">
              <div class="leaderboard-user">
                <span class="leaderboard-rank">#${user.rank}</span>
                <span class="leaderboard-avatar">${user.avatar}</span>
                <div class="leaderboard-details">
                  <span class="leaderboard-name">${user.name}</span>
                  <span class="leaderboard-college">${user.college}</span>
                </div>
              </div>
              <span class="leaderboard-xp-val">${user.xp} XP</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Developer Panel ────────────────────────────────────────────────────────
function renderDeveloper(slot, activeTab = 'reports') {
  const isAuth = sessionStorage.getItem('medquiz_dev_auth') === 'true';
  if (!isAuth) {
    renderDevLogin(slot);
    return;
  }

  const reports = store.getReports();
  const unresolvedCount = store.getUnresolvedReportCount();
  const webhookUrl = store.getWebhook();

  slot.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 10px;">
      <h2>🛠️ Developer Control Panel</h2>
      <button class="btn-secondary" onclick="app.devLogout()" style="font-size: 12px; padding: 6px 14px; border-color: var(--border-color); color: var(--text-muted); height: auto; border-radius: 8px;">🔒 Logout</button>
    </div>
    <p style="color: var(--text-muted); margin-bottom: 24px;">Manage reported questions, configure webhooks, and parse new question documents.</p>

    <!-- Tabs -->
    <div class="dev-tabs">
      <button class="dev-tab-btn ${activeTab === 'reports' ? 'active' : ''}" onclick="app.devSwitchTab('reports')">
        ⚠️ Reported Questions
        ${unresolvedCount > 0 ? `<span class="dev-tab-badge">${unresolvedCount}</span>` : ''}
      </button>
      <button class="dev-tab-btn ${activeTab === 'webhook' ? 'active' : ''}" onclick="app.devSwitchTab('webhook')">
        🔔 Webhook Settings
      </button>
      <button class="dev-tab-btn ${activeTab === 'parser' ? 'active' : ''}" onclick="app.devSwitchTab('parser')">
        📋 Docs Parser
      </button>
    </div>

    <!-- Tab Content -->
    <div id="dev-tab-content">
      ${activeTab === 'reports'  ? renderReportsTab(reports)  : ''}
      ${activeTab === 'webhook'  ? renderWebhookTab(webhookUrl) : ''}
      ${activeTab === 'parser'   ? renderParserTab()           : ''}
    </div>
  `;
}

function renderDevLogin(slot) {
  slot.innerHTML = `
    <div style="max-width: 450px; margin: 60px auto; display: flex; flex-direction: column; gap: 20px;">
      <div class="stats-widget" style="padding: 40px; display: flex; flex-direction: column; gap: 24px; text-align: center; border: 1px solid var(--border-color); box-shadow: var(--card-shadow); background: var(--bg-card); backdrop-filter: var(--glass-blur); border-radius: 24px;">
        <div>
          <span style="font-size: 48px; display: block; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(99,102,241,0.3));">🔐</span>
          <h3 style="font-size: 22px; font-weight: 700;">Developer Authentication</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 6px;">Enter administrative credentials to access controls.</p>
        </div>
        
        <div style="text-align: left; display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group">
            <label class="form-label" style="font-weight: 600;">Username</label>
            <input class="form-input" id="dev-username-input" type="text" placeholder="Enter username" style="height: 48px; border-radius: 12px;" onkeydown="if(event.key === 'Enter') app.devLoginSubmit()">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight: 600;">Password</label>
            <input class="form-input" id="dev-password-input" type="password" placeholder="Enter password" style="height: 48px; border-radius: 12px;" onkeydown="if(event.key === 'Enter') app.devLoginSubmit()">
          </div>
        </div>
        
        <div id="dev-login-error" style="display: none; color: var(--danger); font-size: 13px; font-weight: 600; text-align: center; background: var(--danger-glow); padding: 10px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.2);">
          ❌ Invalid username or password.
        </div>
        
        <button class="btn-primary" id="dev-login-btn" style="height: 48px; border-radius: 12px; font-weight: 600; letter-spacing: 0.5px; background: var(--primary); box-shadow: var(--glow-shadow);" onclick="app.devLoginSubmit()">
          Verify Credentials
        </button>
      </div>
    </div>
  `;
}

function renderReportsTab(reports) {
  if (reports.length === 0) {
    return `
      <div style="text-align: center; padding: 80px 0; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <h3 style="font-size: 20px; font-weight: 600;">No Reports Yet</h3>
        <p style="margin-top: 8px; font-size: 14px;">When students report questions, they will appear here.</p>
      </div>
    `;
  }

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="font-weight: 700;">${reports.length} Total Report${reports.length !== 1 ? 's' : ''} (${store.getUnresolvedReportCount()} Unresolved)</h3>
      <button class="btn-secondary" onclick="app.clearAllResolvedReports()" style="font-size: 12px; padding: 8px 14px;">Clear Resolved</button>
    </div>
    <div class="report-list">
      ${reports.map(r => `
        <div class="report-card ${r.resolved ? 'resolved' : ''}" id="rcard-${r.id}">
          <div class="report-card-header">
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
              <span class="report-category-pill">${r.categoryIcon} ${r.categoryLabel}</span>
              ${r.resolved ? '<span class="report-resolved-pill">✅ Resolved</span>' : ''}
            </div>
            <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">${r.dateFormatted}</span>
          </div>
          <div class="report-question-text">${r.questionText}</div>
          <div class="report-meta-row">
            <span class="report-meta-tag">📚 ${r.subject || 'N/A'}</span>
            ${r.paper  ? `<span class="report-meta-tag">📄 Paper ${r.paper}</span>`   : ''}
            ${r.chapter ? `<span class="report-meta-tag">🔢 Chapter ${r.chapter}</span>` : ''}
            <span class="report-meta-tag" style="color: var(--text-muted);">ID: ${r.id.substring(7, 16)}</span>
          </div>
          ${r.comment ? `<div class="report-comment-box">"${r.comment}"</div>` : ''}
          <div class="report-card-actions">
            <button class="btn-secondary" style="font-size: 12px; padding: 8px 14px; color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="app.deleteReport('${r.id}')">🗑️ Delete</button>
            ${!r.resolved ? `<button class="btn-primary" style="font-size: 12px; padding: 8px 18px; background: var(--accent);" onclick="app.resolveReport('${r.id}')">✅ Mark Resolved</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderWebhookTab(webhookUrl) {
  const hasWebhook = !!webhookUrl;
  return `
    <div style="max-width: 680px; display: flex; flex-direction: column; gap: 24px;">
      <div class="stats-widget" style="padding: 30px; gap: 20px;">
        <h3 style="font-size: 18px; font-weight: 700;">Configure Instant Alert Webhook</h3>
        <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">
          When a student reports a question online, the system immediately sends a rich notification card to your <strong>Discord</strong> or <strong>Slack</strong> channel — no server required!
          <br><br>
          ▶ <strong>Discord:</strong> Server Settings → Integrations → Webhooks → Copy Webhook URL<br>
          ▶ <strong>Slack:</strong> Incoming Webhooks App → Add to Channel → Copy Webhook URL
        </p>

        <div class="form-group">
          <label class="form-label">Webhook URL</label>
          <input class="form-input" id="webhook-url-input" type="url"
            value="${webhookUrl}"
            placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/...">
        </div>

        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="app.saveWebhook()">💾 Save Webhook</button>
          <button class="btn-secondary" onclick="app.testWebhook()">🧪 Send Test Alert</button>
          <div class="webhook-status ${hasWebhook ? 'connected' : 'disconnected'}">
            ${hasWebhook ? '🟢 Webhook Configured' : '🔴 Not Configured'}
          </div>
        </div>

        <div id="webhook-test-result" style="display:none; font-size: 13px; font-weight: 600; margin-top: 6px;"></div>
      </div>

      <div class="stats-widget" style="padding: 24px; gap: 16px;">
        <h4 style="font-weight: 700;">What the Discord Alert looks like:</h4>
        <div style="background: #2b2d31; border-radius: 12px; padding: 20px; font-family: monospace; font-size: 13px; color: #dcddde;">
          <div style="color: #7289da; font-weight: bold; margin-bottom: 8px;">🩺 MedQuiz Report Bot</div>
          <div style="border-left: 4px solid #FF4444; padding-left: 12px;">
            <div style="color: #FF4444; font-weight: bold; margin-bottom: 8px;">⚠️ Question Report: Wrong Answer</div>
            <div style="color: #b9bbbe; margin-bottom: 10px;"><em>মানবদেহের দীর্ঘতম কোষ কোনটি? [MAT: 24-25]</em></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
              <div>📚 Subject: biology</div>
              <div>📄 Paper: Paper 1</div>
              <div>🔢 Chapter: Chapter 1</div>
              <div>📅 Reported At: May 25, 2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderParserTab() {
  return `
    <div class="parser-layout">
      <div class="parser-panel">
        <h4 style="font-weight: 600;">1. Paste Questions Text</h4>
        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
          Supported format:<br>
          <b>[Number]। [Question Body]</b><br>
          * (a) [Option A]<br>
          * (b) [Option B]<br>
          * উত্তরঃ ([Letter])<br>
          * ব্যাখ্যা: [Explanation]
        </p>
        <textarea class="parser-input-textarea" id="parser-input" placeholder="০১। প্রশ্নের টেক্সট...&#10;* (a) উত্তর এ&#10;* (b) উত্তর বি&#10;* (c) উত্তর সি&#10;* (d) উত্তর ডি&#10;* উত্তরঃ (c)&#10;* ব্যাখ্যা: ব্যাখ্যার টেক্সট..."></textarea>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div class="form-group">
            <label class="form-label">Subject</label>
            <select class="form-select" id="parser-subject">
              <option value="biology">Biology (B1/B2)</option>
              <option value="chemistry">Chemistry</option>
              <option value="physics">Physics</option>
              <option value="english">English</option>
              <option value="gk">General Knowledge</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Paper</label>
            <select class="form-select" id="parser-paper">
              <option value="1">1st Paper</option>
              <option value="2">2nd Paper</option>
              <option value="null">None</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Chapter Number</label>
          <input type="number" class="form-input" id="parser-chapter" value="1" min="1" max="12">
        </div>
        <button class="btn-primary" onclick="app.parsePastedQuestions()">Convert Questions</button>
      </div>
      <div class="parser-preview-panel">
        <h4 style="font-weight: 600;">2. Formatted Database Output</h4>
        <p style="font-size: 12px; color: var(--text-muted);">Confirm the output and click "Add to Live Database".</p>
        <div class="preview-json-box" id="parser-output-json">[{ "info": "Output displays here..." }]</div>
        <div style="display: flex; gap: 14px;">
          <button class="btn-secondary" style="flex-grow: 1;" onclick="app.copyParsedCode()">Copy Code</button>
          <button class="btn-primary" style="flex-grow: 1; display: none;" id="btn-add-to-live" onclick="app.addParsedToLive()">Add to Session DB</button>
        </div>
      </div>
    </div>
  `;
}

// ── Modal Controls ─────────────────────────────────────────────────────────
function openConfigModal(title) {
  document.getElementById('modal-config-title').textContent = title;
  document.getElementById('quiz-config-modal').style.display = 'flex';
  document.getElementById('config-negative-marking').checked = store.stats.settings.negativeMarking;
}

function onStartQuizFromModal() {
  document.getElementById('quiz-config-modal').style.display = 'none';
  const qCount    = parseInt(document.getElementById('config-q-count').value);
  const timeLimit = parseInt(document.getElementById('config-time').value);
  const negMarking = document.getElementById('config-negative-marking').checked;

  let pool = getLiveQuestionsPool().filter(q => {
    if (state.tempConfig.subject && q.subject !== state.tempConfig.subject) return false;
    if (state.tempConfig.type === 'chapter') return q.paper === state.tempConfig.paper && q.chapter === state.tempConfig.chapter;
    if (state.tempConfig.type === 'paper')   return q.paper === state.tempConfig.paper;
    return true;
  });

  if (pool.length === 0) { showToast('No questions found for this selection!', 'error'); return; }

  shuffleArray(pool);
  const selected = pool.slice(0, Math.min(qCount, pool.length));
  const config = {
    mode: state.tempConfig.type === 'chapter' ? 'Chapterwise Prep' : (state.tempConfig.type === 'paper' ? 'Paperwise Prep' : 'Subjectwise Prep'),
    negMarking, timeLimit, totalQs: selected.length,
    description: state.tempConfig.title
  };
  startQuiz(selected, config);
}

// ── Quiz Engine ────────────────────────────────────────────────────────────
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getLiveQuestionsPool() {
  return [...questionsDatabase, ...store.customQuestions];
}

function startQuiz(questions, config) {
  state.quiz.questions    = questions;
  state.quiz.currentIndex = 0;
  state.quiz.answers      = new Array(questions.length).fill(null);
  state.quiz.skipped      = new Array(questions.length).fill(false);
  state.quiz.timeRemaining = config.timeLimit * 60;
  state.quiz.totalDuration = config.timeLimit * 60;
  state.quiz.config = config;
  if (state.quiz.timerInterval) clearInterval(state.quiz.timerInterval);
  state.quiz.timerInterval = setInterval(updateQuizTimer, 1000);
  renderQuizArena();
}

function updateQuizTimer() {
  state.quiz.timeRemaining -= 1;
  const timerBox = document.getElementById('exam-timer');
  if (timerBox) {
    const m = Math.floor(state.quiz.timeRemaining / 60);
    const s = state.quiz.timeRemaining % 60;
    timerBox.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (state.quiz.timeRemaining < state.quiz.totalDuration * 0.15) timerBox.parentElement.classList.add('warning');
  }
  if (state.quiz.timeRemaining <= 0) {
    clearInterval(state.quiz.timerInterval);
    state.quiz.timerInterval = null;
    showToast('Time is up! Submitting exam automatically.', 'info');
    setTimeout(() => submitQuiz(true), 1000);
  }
}

function renderQuizArena() {
  const slot = document.getElementById('main-view-slot');
  document.getElementById('view-title').textContent = `${state.quiz.config.mode} Arena`;

  slot.innerHTML = `
    <div class="exam-header-bar">
      <div>
        <h3 style="font-size: 18px; font-weight: 700;">${state.quiz.config.description}</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Answer carefully — your time is running.</p>
      </div>
      <div class="timer-box">⏱️ <span id="exam-timer">00:00</span></div>
    </div>

    <div class="exam-body-grid">
      <div class="question-panel" id="question-render-slot"></div>
      <div class="exam-nav-panel">
        <h4 style="font-weight: 700; font-size: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Navigator</h4>
        <div class="exam-nav-grid" id="exam-nav-grid-slot"></div>
        <div style="border-top: 1px solid var(--border-color); padding-top: 15px; font-size: 12px; display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Negative Marking:</span>
          <span style="font-weight: bold; color: ${state.quiz.config.negMarking ? 'var(--danger)' : 'var(--text-muted)'};">${state.quiz.config.negMarking ? 'ON (-0.25)' : 'OFF'}</span>
        </div>
        <button class="btn-primary" style="margin-top: 10px; background: var(--accent); box-shadow: none;" onclick="app.submitQuizPrompt()">Submit Exam</button>
      </div>
    </div>
  `;

  window.app.selectOption   = selectOption;
  window.app.prevQuestion   = prevQuestion;
  window.app.nextQuestion   = nextQuestion;
  window.app.skipQuestion   = skipQuestion;
  window.app.jumpToQuestion = jumpToQuestion;
  window.app.submitQuizPrompt = () => {
    if (confirm("Are you sure you want to submit this exam?")) submitQuiz(false);
  };
  window.app.reportQuestion = (idx) => {
    openReportModal(state.quiz.questions[idx]);
  };

  renderQuestion();
  renderQuestionNav();
  updateQuizTimer();
}

function renderQuestion() {
  const current = state.quiz.questions[state.quiz.currentIndex];
  const answeredIdx = state.quiz.answers[state.quiz.currentIndex];
  const container = document.getElementById('question-render-slot');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <span class="question-meta-row">Question ${state.quiz.currentIndex + 1} of ${state.quiz.questions.length}</span>
        <button class="btn-report" onclick="app.reportQuestion(${state.quiz.currentIndex})">⚠️ Report</button>
      </div>
      <h3 class="question-title-text">${current.question}</h3>
      <div class="options-list">
        ${current.options.map((opt, i) => `
          <div class="option-item ${answeredIdx === i ? 'selected' : ''}" onclick="app.selectOption(${i})">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="option-text">${opt}</span>
          </div>
        `).join('')}
      </div>
      <div class="exam-actions-bar">
        <button class="btn-secondary" onclick="app.prevQuestion()" ${state.quiz.currentIndex === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Previous</button>
        <button class="btn-secondary" onclick="app.skipQuestion()" style="color: var(--warning); border-color: rgba(245,158,11,0.3);">Skip / Bookmark</button>
        <button class="btn-primary" onclick="app.nextQuestion()">${state.quiz.currentIndex === state.quiz.questions.length - 1 ? 'Finish' : 'Next Question'}</button>
      </div>
    </div>
  `;
}

function renderQuestionNav() {
  const gridSlot = document.getElementById('exam-nav-grid-slot');
  if (!gridSlot) return;
  gridSlot.innerHTML = state.quiz.questions.map((q, i) => {
    let cls = '';
    if (state.quiz.currentIndex === i) cls = 'active';
    else if (state.quiz.answers[i] !== null) cls = 'answered';
    else if (state.quiz.skipped[i]) cls = 'skipped';
    return `<button class="nav-q-btn ${cls}" onclick="app.jumpToQuestion(${i})">${i + 1}</button>`;
  }).join('');
}

function selectOption(idx) {
  state.quiz.answers[state.quiz.currentIndex] = idx;
  state.quiz.skipped[state.quiz.currentIndex] = false;
  renderQuestion();
  renderQuestionNav();
}

function prevQuestion() {
  if (state.quiz.currentIndex > 0) { state.quiz.currentIndex--; renderQuestion(); renderQuestionNav(); }
}

function nextQuestion() {
  if (state.quiz.currentIndex < state.quiz.questions.length - 1) { state.quiz.currentIndex++; renderQuestion(); renderQuestionNav(); }
  else window.app.submitQuizPrompt();
}

function skipQuestion() {
  state.quiz.skipped[state.quiz.currentIndex] = true;
  state.quiz.answers[state.quiz.currentIndex] = null;
  nextQuestion();
}

function jumpToQuestion(idx) {
  state.quiz.currentIndex = idx;
  renderQuestion();
  renderQuestionNav();
}

function submitQuiz(isAuto = false) {
  if (state.quiz.timerInterval) { clearInterval(state.quiz.timerInterval); state.quiz.timerInterval = null; }
  let correct = 0, incorrect = 0, skipped = 0;
  state.quiz.questions.forEach((q, i) => {
    const ans = state.quiz.answers[i];
    if (ans === null) skipped++;
    else if (ans === q.correctIndex) correct++;
    else incorrect++;
  });
  let score = correct - (state.quiz.config.negMarking ? incorrect * 0.25 : 0);
  const total = state.quiz.questions.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const duration = state.quiz.totalDuration - state.quiz.timeRemaining;
  const xp = correct * 10 + (state.quiz.config.negMarking ? 50 : 0);

  const result = {
    correct, incorrect, skipped, totalQuestions: total, rawScore: score,
    xpEarned: xp, accuracy, duration,
    mode: state.quiz.config.mode,
    negativeMarking: state.quiz.config.negMarking,
    description: state.quiz.config.description
  };
  const unlockedBadges = store.completeExam(result);
  updateHeaderStats();
  renderResultsView(result, state.quiz.questions, state.quiz.answers, unlockedBadges);
}

function renderResultsView(result, questions, answers, badges) {
  const slot = document.getElementById('main-view-slot');
  document.getElementById('view-title').textContent = "Exam Results";
  const minUsed = Math.floor(result.duration / 60);
  const secUsed = String(result.duration % 60).padStart(2, '0');
  const scoreFormatted = result.negativeMarking ? result.rawScore.toFixed(2) : result.rawScore;

  slot.innerHTML = `
    <div style="max-width: 840px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
      ${badges && badges.length > 0 ? `
        <div style="background: var(--primary-glow); border: 1px solid rgba(99,102,241,0.2); padding: 24px; border-radius: 20px; text-align: center;">
          <span style="font-size: 32px;">🎉</span>
          <h4 style="font-weight: 700; color: var(--primary); margin-top: 10px;">Achievement Unlocked!</h4>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 12px; flex-wrap: wrap;">
            ${badges.map(b => `<div style="background: var(--bg-card); padding: 10px 18px; border-radius: 12px; font-weight: bold; border: 1px solid var(--border-color);">${b.icon} ${b.title}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="results-summary-card">
        <h3 style="font-size: 22px; font-weight: 700;">Performance Summary</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: -10px;">${result.description}</p>
        <div class="stats-circle-container">
          <svg class="circle-progress-svg" width="140" height="140">
            <circle class="circle-progress-bg" cx="70" cy="70" r="60" style="stroke-width: 12;"></circle>
            <circle class="circle-progress-bar" id="result-progress-ring" cx="70" cy="70" r="60" style="stroke-width: 12; stroke: var(--accent); stroke-dashoffset: 377;"></circle>
            <text class="circle-text" x="70" y="78" text-anchor="middle" font-size="24" fill="var(--text-main)" transform="rotate(90 70 70)">${result.accuracy}%</text>
          </svg>
        </div>
        <h2 style="font-size: 36px; font-weight: 700;">${scoreFormatted} <span style="font-size: 16px; font-weight: 500; color: var(--text-muted);">/ ${result.totalQuestions} Marks</span></h2>
        <div class="results-stats-row">
          <div class="result-stat-box" style="border-color: rgba(16,185,129,0.2);">
            <span class="result-stat-val" style="color: var(--accent);">${result.correct}</span>
            <span class="result-stat-label">CORRECT</span>
          </div>
          <div class="result-stat-box" style="border-color: rgba(239,68,68,0.2);">
            <span class="result-stat-val" style="color: var(--danger);">${result.incorrect}</span>
            <span class="result-stat-label">INCORRECT</span>
          </div>
          <div class="result-stat-box" style="border-color: rgba(245,158,11,0.2);">
            <span class="result-stat-val" style="color: var(--warning);">${result.skipped}</span>
            <span class="result-stat-label">SKIPPED</span>
          </div>
          <div class="result-stat-box">
            <span class="result-stat-val">${minUsed}:${secUsed}</span>
            <span class="result-stat-label">TIME</span>
          </div>
        </div>
        <div style="display: flex; gap: 14px; width: 100%; margin-top: 10px;">
          <button class="btn-secondary" style="flex-grow: 1;" onclick="window.location.hash='#dashboard'">Go to Dashboard</button>
          <button class="btn-primary"   style="flex-grow: 1;" onclick="document.getElementById('review-title-anchor').scrollIntoView({behavior:'smooth'})">Review Answers</button>
        </div>
      </div>

      <h3 class="review-questions-title" id="review-title-anchor">Answers & Explanations Review</h3>
      <div style="display: flex; flex-direction: column; gap: 24px;">
        ${questions.map((q, qIdx) => {
          const uAns = answers[qIdx];
          const isCorrect = uAns === q.correctIndex;
          const borderColor = uAns === null ? 'var(--border-color)' : (isCorrect ? 'var(--accent)' : 'var(--danger)');
          const statusText = uAns === null ? 'Skipped' : (isCorrect ? 'Correct (+1.00)' : 'Incorrect (-0.25)');
          const statusColor = uAns === null ? 'var(--text-muted)' : (isCorrect ? 'var(--accent)' : 'var(--danger)');
          return `
            <div class="question-panel" style="padding: 30px; border-color: ${borderColor};">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <span class="question-meta-row" style="background: transparent; color: ${statusColor};">Q${qIdx + 1} • ${statusText}</span>
                <button class="btn-report" onclick="app.reportReviewQuestion(${qIdx})">⚠️ Report</button>
              </div>
              <h4 class="question-title-text" style="font-size: 18px; margin-top: 10px;">${q.question}</h4>
              <div class="options-list" style="margin-top: 15px; gap: 8px;">
                ${q.options.map((opt, oIdx) => {
                  let cls = '';
                  if (oIdx === q.correctIndex) cls = 'correct';
                  else if (uAns === oIdx && !isCorrect) cls = 'wrong';
                  return `
                    <div class="option-item ${cls}" style="padding: 10px 16px; cursor: default; transform: none; box-shadow: none;">
                      <span class="option-letter" style="width: 24px; height: 24px; font-size: 11px;">${String.fromCharCode(65 + oIdx)}</span>
                      <span class="option-text" style="font-size: 14px;">${opt}</span>
                    </div>
                  `;
                }).join('')}
              </div>
              ${q.explanation ? `<div class="explanation-box"><div class="explanation-title">Explanation (ব্যাখ্যা):</div><div>${q.explanation}</div></div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Expose report for review sheet
  window.app.reportReviewQuestion = (qIdx) => {
    openReportModal(questions[qIdx]);
  };

  // Animate progress ring
  setTimeout(() => {
    const ring = document.getElementById('result-progress-ring');
    if (ring) ring.style.strokeDashoffset = 377 - (377 * result.accuracy / 100);
  }, 200);
}

// ── app.* namespace ────────────────────────────────────────────────────────
window.app = {
  showChapters: (subject, paper) => {
    document.getElementById('subject-cards-grid').style.display = 'none';
    document.getElementById('chapters-view-box').style.display = 'block';
    const config = CHAPTERS_MAPPING[subject];
    const paperConfig = config.papers[paper];
    document.getElementById('chapters-title').textContent = `${config.name} — ${paperConfig.name}`;
    let html = '';
    for (let c = 1; c <= paperConfig.count; c++) {
      html += `<button class="chapter-btn" onclick="app.configureChapterQuiz('${subject}', ${paper}, ${c})"><span class="chapter-number">Chapter ${c}</span><span>অধ্যায় ${c}</span></button>`;
    }
    document.getElementById('chapters-grid-slot').innerHTML = html;
  },
  backToSubjects: () => {
    document.getElementById('chapters-view-box').style.display = 'none';
    document.getElementById('subject-cards-grid').style.display = 'grid';
  },
  configureChapterQuiz: (subject, paper, chapter) => {
    state.tempConfig = { type: 'chapter', subject, paper, chapter, title: `${CHAPTERS_MAPPING[subject].name} (Paper ${paper}, Chapter ${chapter})` };
    openConfigModal(state.tempConfig.title);
  },
  configurePaperQuiz: (subject, paper) => {
    state.tempConfig = { type: 'paper', subject, paper, title: `${CHAPTERS_MAPPING[subject].name} (${paper === 1 ? '1st' : '2nd'} Paper)` };
    openConfigModal(state.tempConfig.title);
  },
  configureSubjectQuiz: (subject) => {
    state.tempConfig = { type: 'subject', subject, title: `${CHAPTERS_MAPPING[subject].name} (Full Subject)` };
    openConfigModal(state.tempConfig.title);
  },
  startCustomQuiz: () => {
    const checkedSubjects = Array.from(document.querySelectorAll('input[name="custom-subject"]:checked')).map(el => el.value);
    if (checkedSubjects.length === 0) { showToast('Select at least one subject!', 'error'); return; }
    const qCount = parseInt(document.getElementById('custom-q-count').value);
    const durationMins = parseInt(document.getElementById('custom-time').value);
    const negMarking = document.getElementById('custom-neg-toggle').checked;
    let pool = getLiveQuestionsPool().filter(q => checkedSubjects.includes(q.subject));
    if (pool.length === 0) { showToast('No questions found!', 'error'); return; }
    shuffleArray(pool);
    startQuiz(pool.slice(0, Math.min(qCount, pool.length)), {
      mode: 'Custom Preparation', negMarking, timeLimit: durationMins, totalQs: qCount,
      description: `Subjects: ${checkedSubjects.map(s => CHAPTERS_MAPPING[s].name).join(', ')}`
    });
  },
  startMATMock: () => {
    const pool = getLiveQuestionsPool();
    const bio = pool.filter(q => q.subject === 'biology');   shuffleArray(bio);
    const che = pool.filter(q => q.subject === 'chemistry'); shuffleArray(che);
    const phy = pool.filter(q => q.subject === 'physics');   shuffleArray(phy);
    const eng = pool.filter(q => q.subject === 'english');   shuffleArray(eng);
    const gk  = pool.filter(q => q.subject === 'gk');        shuffleArray(gk);
    let selected = [...bio.slice(0,30), ...che.slice(0,25), ...phy.slice(0,20), ...eng.slice(0,15), ...gk.slice(0,10)];
    if (selected.length < 100) {
      const remaining = pool.filter(q => !selected.includes(q)); shuffleArray(remaining);
      selected.push(...remaining.slice(0, 100 - selected.length));
    }
    shuffleArray(selected);
    startQuiz(selected, { mode: 'MAT Mock', negMarking: true, timeLimit: 60, totalQs: selected.length, description: "Full Medical Admission Test Simulation" });
  },
  // Developer Panel
  devLoginSubmit: () => {
    const user = document.getElementById('dev-username-input').value.trim();
    const pass = document.getElementById('dev-password-input').value;
    const errorEl = document.getElementById('dev-login-error');
    if (user === 'safisalman' && pass === 'Salman26?') {
      sessionStorage.setItem('medquiz_dev_auth', 'true');
      showToast('Welcome back, safisalman! 👋', 'success');
      renderDeveloper(document.getElementById('main-view-slot'), 'reports');
    } else {
      errorEl.style.display = 'block';
      showToast('Authentication failed!', 'error');
    }
  },
  devLogout: () => {
    sessionStorage.removeItem('medquiz_dev_auth');
    showToast('Logged out of Developer Panel.', 'info');
    renderDeveloper(document.getElementById('main-view-slot'), 'reports');
  },
  devSwitchTab: (tab) => renderDeveloper(document.getElementById('main-view-slot'), tab),
  resolveReport: (id) => {
    store.resolveReport(id);
    updateNavReportBadge();
    showToast('Report marked as resolved ✅', 'success');
    renderDeveloper(document.getElementById('main-view-slot'), 'reports');
  },
  deleteReport: (id) => {
    if (!confirm('Permanently delete this report?')) return;
    store.deleteReport(id);
    updateNavReportBadge();
    showToast('Report deleted 🗑️', 'info');
    renderDeveloper(document.getElementById('main-view-slot'), 'reports');
  },
  clearAllResolvedReports: () => {
    const resolved = store.getReports().filter(r => r.resolved);
    if (resolved.length === 0) { showToast('No resolved reports to clear!', 'info'); return; }
    if (!confirm(`Delete ${resolved.length} resolved report(s)?`)) return;
    resolved.forEach(r => store.deleteReport(r.id));
    updateNavReportBadge();
    showToast(`Cleared ${resolved.length} resolved report(s) 🗑️`, 'info');
    renderDeveloper(document.getElementById('main-view-slot'), 'reports');
  },
  saveWebhook: () => {
    const url = document.getElementById('webhook-url-input').value.trim();
    store.setWebhook(url);
    showToast(url ? 'Webhook URL saved! 🔔' : 'Webhook URL cleared.', 'success');
    renderDeveloper(document.getElementById('main-view-slot'), 'webhook');
  },
  testWebhook: async () => {
    const url = document.getElementById('webhook-url-input').value.trim();
    if (!url) { showToast('Enter a webhook URL first!', 'error'); return; }
    store.setWebhook(url);
    const testReport = {
      id: 'test_' + Date.now(),
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      questionId: 'TEST_001',
      questionText: '🧪 This is a TEST alert from MedQuiz Prep! If you see this, your webhook is working correctly. ✅',
      subject: 'test', paper: 0, chapter: 0,
      categoryId: 'typing_mistake', categoryLabel: 'Test Notification', categoryIcon: '🧪',
      comment: 'Test webhook from Developer Panel — Admin Settings.',
      resolved: false
    };
    const resultEl = document.getElementById('webhook-test-result');
    resultEl.style.display = 'block';
    resultEl.textContent = '⏳ Sending test alert...';
    const result = await store.sendWebhookAlert(testReport);
    if (result.success) {
      resultEl.style.color = 'var(--accent)';
      resultEl.textContent = '✅ Test alert delivered successfully! Check your Discord/Slack channel.';
    } else {
      resultEl.style.color = 'var(--danger)';
      resultEl.textContent = `❌ Delivery failed: ${result.reason || 'HTTP ' + result.status}. Check your URL.`;
    }
  },
  // Parser
  parsePastedQuestions: () => {
    const text = document.getElementById('parser-input').value;
    const subject = document.getElementById('parser-subject').value;
    const paperVal = document.getElementById('parser-paper').value;
    const paper = paperVal === 'null' ? null : parseInt(paperVal);
    const chapter = parseInt(document.getElementById('parser-chapter').value);
    if (!text.trim()) { showToast('Paste question text first!', 'error'); return; }
    const parsed = parseDocMCQList(text, subject, paper, chapter);
    document.getElementById('parser-output-json').textContent = JSON.stringify(parsed, null, 2);
    state.tempParsed = parsed;
    const addBtn = document.getElementById('btn-add-to-live');
    addBtn.style.display = parsed.length > 0 ? 'block' : 'none';
    if (parsed.length === 0) showToast('Could not parse any valid questions. Check formatting!', 'error');
    else showToast(`Parsed ${parsed.length} questions successfully!`, 'success');
  },
  copyParsedCode: () => {
    navigator.clipboard.writeText(document.getElementById('parser-output-json').textContent)
      .then(() => showToast('Code copied to clipboard!', 'success'))
      .catch(() => showToast('Copy failed. Please select and copy manually.', 'error'));
  },
  addParsedToLive: () => {
    if (state.tempParsed && state.tempParsed.length > 0) {
      state.tempParsed.forEach(q => store.saveCustomQuestion(q));
      showToast(`Added ${state.tempParsed.length} questions to your session database!`, 'success');
      document.getElementById('btn-add-to-live').style.display = 'none';
    }
  }
};

// ── Document MCQ Parser ────────────────────────────────────────────────────
function parseDocMCQList(text, subject, paper, chapter) {
  const lines = text.split('\n');
  const questions = [];
  let currentQ = null;
  const banglaDigits = "০১২৩৪৫৬৭৮৯";
  const convertBD = s => { let o = ''; for (let c of s) { const i = banglaDigits.indexOf(c); o += i >= 0 ? i : c; } return o; };
  const qPat = /^\s*([০-৯\d]+)[\s।\.\-]+(.*)$/;
  const oPat = /^\s*\*?\s*\(\s*([a-dA-D])\s*\)\s*(.*)$/;
  const bAns1 = String.fromCharCode(0x0989);
  const bAns2 = String.fromCharCode(0x09A4);
  const bExp1 = String.fromCharCode(0x09AC, 0x09CD, 0x09AF, 0x09BE);
  const bExp2 = String.fromCharCode(0x099C, 0x09C7, 0x09A8);

  for (const line of lines) {
    const ls = line.trim();
    if (!ls) continue;
    const qm = ls.match(qPat);
    if (qm && !ls.includes('---') && qm[1].length <= 4) {
      if (currentQ && currentQ.options.length === 4 && currentQ.correctIndex !== null) questions.push(currentQ);
      const qn = parseInt(convertBD(qm[1]));
      currentQ = { id: `${subject}_c${chapter}_${qn}_${Date.now()}`, subject, paper, chapter, question: qm[2].trim(), options: [], correctIndex: null, explanation: '' };
      continue;
    }
    if (currentQ) {
      const om = ls.match(oPat);
      if (om) { currentQ.options.push(om[2].trim()); continue; }
      if (ls.includes(bAns1 + bAns2)) {
        const lm = ls.match(/\(\s*([a-dA-D])\s*\)/);
        if (lm) { currentQ.correctIndex = lm[1].toLowerCase().charCodeAt(0) - 97; continue; }
      }
      if (ls.includes(bExp1) || ls.includes(bExp2)) {
        const ci = ls.indexOf(':');
        currentQ.explanation = ci >= 0 ? ls.substring(ci + 1).trim() : ls.replace('*', '').trim();
        continue;
      }
      if (currentQ.explanation && ls.startsWith('*') && currentQ.options.length === 4) {
        currentQ.explanation += ' ' + ls.substring(1).trim();
      }
    }
  }
  if (currentQ && currentQ.options.length === 4 && currentQ.correctIndex !== null) questions.push(currentQ);
  return questions;
}
