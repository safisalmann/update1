# GitHub Setup — Step-by-Step Guide
# Run this script in PowerShell AFTER installing Git from https://git-scm.com/download/win

# ── CONFIGURATION — UPDATE THESE TWO LINES ──────────────────────────────────
$GITHUB_USERNAME = "YOUR_GITHUB_USERNAME"   # e.g. "iamsa"
$REPO_NAME       = "medquiz-prep"           # The name for the new GitHub repo
# ─────────────────────────────────────────────────────────────────────────────

$PROJECT_DIR = "C:\Users\iamsa\.gemini\antigravity\scratch\medquiz-prep"

# 1. Configure Git identity (only needed once per machine)
git config --global user.name  $GITHUB_USERNAME
git config --global user.email "$GITHUB_USERNAME@users.noreply.github.com"

# 2. Initialize Git in the project folder
Set-Location $PROJECT_DIR
git init
git branch -M main

# 3. Stage all files and make the first commit
git add .
git commit -m "Initial commit: MedQuiz Prep with Question Reporting System

- 308 compiled Biology 1st Paper MCQs (B1 Chapter 1)
- 5 exam modes: Chapterwise, Paperwise, Subjectwise, MAT Mock, Custom
- Negative marking toggle (-0.25 per wrong answer)
- Question reporting system with 7 error categories
- Discord/Slack webhook alerts for online deployments
- Developer Control Panel with report management
- Achievements, XP streaks, and leaderboard"

# 4. Create the GitHub repository and push
# OPTION A: If you have GitHub CLI (gh) installed:
#   gh repo create $REPO_NAME --public --push --source .

# OPTION B: Manual push (most common):
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Now go to GitHub and create the repository manually:" -ForegroundColor Cyan
Write-Host " https://github.com/new" -ForegroundColor Yellow
Write-Host " Repository name: $REPO_NAME" -ForegroundColor Yellow
Write-Host " Visibility: Public or Private (your choice)" -ForegroundColor Yellow
Write-Host " DO NOT check 'Initialize repository' — keep it empty!" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter AFTER creating the empty repo on GitHub to continue..."

git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git push -u origin main

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SUCCESS! Your project is now live at:" -ForegroundColor Green
Write-Host " https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor Yellow
Write-Host ""
Write-Host " To deploy free on GitHub Pages:" -ForegroundColor Cyan
Write-Host " Repo Settings -> Pages -> Deploy from Branch -> main / root" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
