// store.js - State Management & Persistence for MedQuiz Prep

const STATS_KEY = "medquiz_user_stats";
const CUSTOM_QUESTIONS_KEY = "medquiz_custom_questions";
const REPORTS_KEY = "medquiz_reported_questions";
const WEBHOOK_KEY = "medquiz_webhook_url";

const DEFAULT_STATS = {
  streak: 0,
  lastPlayedDate: null,
  totalXP: 0,
  testsCompleted: 0,
  questionsAttempted: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  achievements: [], // List of unlocked achievement IDs
  examHistory: [],  // Detailed log of past tests
  settings: {
    negativeMarking: false,
    defaultTimeLimit: 15, // in minutes
    defaultQuestionCount: 20
  }
};

// The 7 report categories as defined by the developer
export const REPORT_CATEGORIES = [
  { id: "wrong_answer",       label: "Wrong Answer",              desc: "The marked correct answer is incorrect",         icon: "❌" },
  { id: "no_answer",          label: "No Answer",                 desc: "No correct answer exists among the options",     icon: "🚫" },
  { id: "incorrect_question", label: "Incorrect Question",        desc: "The question itself is flawed or unclear",       icon: "🔀" },
  { id: "typing_mistake",     label: "Typing Mistake",            desc: "Spelling or typographical error in the text",    icon: "✏️" },
  { id: "fabricated",         label: "Question Fabricated/Unfound", desc: "Question cannot be found in any reference",   icon: "👻" },
  { id: "wrong_reference",    label: "Wrong Reference",           desc: "Source/reference is incorrect or misattributed", icon: "📚" },
  { id: "wrong_solution",     label: "Wrong Solution/Explanation", desc: "The explanation or solution is incorrect",      icon: "📝" },
];

const ACHIEVEMENTS_LIST = [
  {
    id: "first_exam",
    title: "First Step (প্রথম ধাপ)",
    desc: "Complete your first exam preparation test",
    icon: "🩺",
    xp: 100
  },
  {
    id: "perfect_score",
    title: "Perfectionist (শতভাগ)",
    desc: "Score a perfect 100% accuracy on a test of 10+ questions",
    icon: "🏆",
    xp: 500
  },
  {
    id: "negative_pioneer",
    title: "Fearless Doctor (সাহসী ডাক্তার)",
    desc: "Complete a test with negative marking enabled",
    icon: "⚡",
    xp: 200
  },
  {
    id: "streak_three",
    title: "Consistent Aspirant (ধারাবাহিক)",
    desc: "Achieve a 3-day exam preparation streak",
    icon: "🔥",
    xp: 300
  },
  {
    id: "mat_conqueror",
    title: "MAT Conqueror (ভর্তিযোদ্ধা)",
    desc: "Complete a full 100-question Medical Admission Mock test",
    icon: "🔬",
    xp: 1000
  }
];

class MedQuizStore {
  constructor() {
    this.stats = this.loadStats();
    this.customQuestions = this.loadCustomQuestions();
    this.reports = this.loadReports();
    this.webhookUrl = localStorage.getItem(WEBHOOK_KEY) || "https://discordapp.com/api/webhooks/1508182339023274098/ffH9YiGiEJfJe5Tbb51fiXRJcmefOwsDHXim-rGLSnPx2vrMnb6dBPKPOG1HRzlfyYEi";
    this.updateStreak();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  loadStats() {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) {
      return JSON.parse(JSON.stringify(DEFAULT_STATS));
    }
    const parsed = JSON.parse(data);
    return { ...DEFAULT_STATS, ...parsed, settings: { ...DEFAULT_STATS.settings, ...parsed.settings } };
  }

  saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
  }

  // ── Custom Questions ───────────────────────────────────────────────────────

  loadCustomQuestions() {
    const data = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveCustomQuestion(question) {
    this.customQuestions.push(question);
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(this.customQuestions));
  }

  // ── Reported Questions ─────────────────────────────────────────────────────

  loadReports() {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveReports() {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(this.reports));
  }

  /**
   * Add a new question report.
   * @param {object} report - { questionId, questionText, subject, paper, chapter, categoryId, comment }
   * @returns {object} The saved report object (with id and timestamp)
   */
  addReport(report) {
    const category = REPORT_CATEGORIES.find(c => c.id === report.categoryId);
    const saved = {
      id: "report_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      resolved: false,
      categoryLabel: category ? category.label : report.categoryId,
      categoryIcon: category ? category.icon : "⚠️",
      ...report
    };
    this.reports.unshift(saved);
    this.saveReports();
    return saved;
  }

  getReports() {
    return this.reports;
  }

  getUnresolvedReportCount() {
    return this.reports.filter(r => !r.resolved).length;
  }

  /**
   * Toggle the resolved state of a report.
   */
  resolveReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.resolved = true;
      this.saveReports();
    }
  }

  /**
   * Permanently delete a report (only for developer cleanup).
   */
  deleteReport(reportId) {
    this.reports = this.reports.filter(r => r.id !== reportId);
    this.saveReports();
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  setWebhook(url) {
    this.webhookUrl = url.trim();
    localStorage.setItem(WEBHOOK_KEY, this.webhookUrl);
  }

  getWebhook() {
    return this.webhookUrl;
  }

  /**
   * Dispatch a Discord/Slack webhook alert for a new report.
   * @param {object} report - The full saved report object
   */
  async sendWebhookAlert(report) {
    const url = this.webhookUrl;
    if (!url) return { success: false, reason: "No webhook URL configured" };

    // Detect Discord vs Slack by URL pattern
    const isDiscord = url.includes("discord.com/api/webhooks");
    let payload;

    if (isDiscord) {
      // Discord Rich Embed format
      payload = {
        username: "MedQuiz Report Bot 🩺",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: `${report.categoryIcon} Question Report: ${report.categoryLabel}`,
          color: 0xFF4444,
          description: `**Question Text:**\n> ${report.questionText.substring(0, 300)}${report.questionText.length > 300 ? '...' : ''}`,
          fields: [
            { name: "📌 Report ID",    value: `\`${report.id}\``,                           inline: true },
            { name: "📚 Subject",      value: report.subject || "N/A",                      inline: true },
            { name: "📄 Paper",        value: report.paper ? `Paper ${report.paper}` : "N/A", inline: true },
            { name: "🔢 Chapter",      value: report.chapter ? `Chapter ${report.chapter}` : "N/A", inline: true },
            { name: "🏷️ Category",    value: `${report.categoryIcon} ${report.categoryLabel}`, inline: true },
            { name: "📅 Reported At", value: report.dateFormatted,                          inline: true },
            ...(report.comment ? [{ name: "💬 Student Comment", value: report.comment, inline: false }] : []),
          ],
          footer: { text: "MedQuiz Prep — Question Reporting System" },
          timestamp: report.timestamp
        }]
      };
    } else {
      // Slack Block Kit format
      payload = {
        text: `${report.categoryIcon} New Question Report: *${report.categoryLabel}*`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `${report.categoryIcon} Question Report: ${report.categoryLabel}` }
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Question:*\n>${report.questionText.substring(0, 250)}${report.questionText.length > 250 ? '...' : ''}` }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Subject:* ${report.subject || "N/A"}` },
              { type: "mrkdwn", text: `*Paper:* ${report.paper ? 'Paper ' + report.paper : 'N/A'}` },
              { type: "mrkdwn", text: `*Chapter:* ${report.chapter ? 'Chapter ' + report.chapter : 'N/A'}` },
              { type: "mrkdwn", text: `*Reported At:* ${report.dateFormatted}` },
            ]
          },
          ...(report.comment ? [{
            type: "section",
            text: { type: "mrkdwn", text: `*Student Comment:*\n${report.comment}` }
          }] : []),
          { type: "divider" }
        ]
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // ── Streak & Exam Completion ───────────────────────────────────────────────

  updateStreak() {
    const today = new Date().toDateString();
    if (this.stats.lastPlayedDate) {
      const lastDate = new Date(this.stats.lastPlayedDate);
      const diffTime = Math.abs(new Date(today) - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        this.stats.streak = 0;
        this.saveStats();
      }
    }
  }

  completeExam(result) {
    this.stats.testsCompleted += 1;
    this.stats.questionsAttempted += (result.correct + result.incorrect);
    this.stats.correctAnswers += result.correct;
    this.stats.incorrectAnswers += result.incorrect;
    this.stats.totalXP += result.xpEarned;

    const today = new Date().toDateString();
    if (this.stats.lastPlayedDate !== today) {
      this.stats.streak += 1;
      this.stats.lastPlayedDate = today;
    }

    this.stats.examHistory.unshift({
      id: "exam_" + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...result
    });

    const unlockedNow = [];
    if (!this.isUnlocked("first_exam")) unlockedNow.push("first_exam");
    if (result.accuracy === 100 && result.totalQuestions >= 10 && !this.isUnlocked("perfect_score")) unlockedNow.push("perfect_score");
    if (result.negativeMarking && !this.isUnlocked("negative_pioneer")) unlockedNow.push("negative_pioneer");
    if (this.stats.streak >= 3 && !this.isUnlocked("streak_three")) unlockedNow.push("streak_three");
    if (result.mode === "MAT Mock" && result.totalQuestions >= 100 && !this.isUnlocked("mat_conqueror")) unlockedNow.push("mat_conqueror");

    unlockedNow.forEach(id => {
      this.stats.achievements.push(id);
      const achievement = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (achievement) this.stats.totalXP += achievement.xp;
    });

    this.saveStats();
    return unlockedNow.map(id => ACHIEVEMENTS_LIST.find(a => a.id === id));
  }

  isUnlocked(id) {
    return this.stats.achievements.includes(id);
  }

  getAchievements() {
    return ACHIEVEMENTS_LIST.map(a => ({ ...a, unlocked: this.isUnlocked(a.id) }));
  }

  updateSettings(settings) {
    this.stats.settings = { ...this.stats.settings, ...settings };
    this.saveStats();
  }

  getLeaderboard() {
    return [
      { name: "Tasnim Anjum",  college: "Dhaka Medical College",           xp: 12450, avatar: "👩‍⚕️" },
      { name: "Sajid Hasan",   college: "Sir Salimullah Medical College",  xp: 9820,  avatar: "👨‍⚕️" },
      { name: "Nusrat Jahan",  college: "Mymensingh Medical College",      xp: 8400,  avatar: "👩‍⚕️" },
      { name: "You",           college: "Aspirant",                        xp: this.stats.totalXP, avatar: "🩺" },
      { name: "Abir Rahman",   college: "Chittagong Medical College",      xp: 6210,  avatar: "👨‍⚕️" },
      { name: "Farhana Yasmin",college: "Rajshahi Medical College",        xp: 5800,  avatar: "👩‍⚕️" }
    ].sort((a, b) => b.xp - a.xp).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }
}

export const store = new MedQuizStore();
