# Git Commit Workflow Guide

This guide helps you commit frequently and keep a clean commit history.

## Commit Often — Best Practices

### When to Commit
- After completing a feature (e.g., new endpoint, new model)
- After fixing a bug
- After adding tests
- After updating documentation
- After significant refactoring
- **Aim for 1-3 commits per development session**

### Commit Message Format

Keep messages clear and descriptive:

```
<type>: <subject>

<body (optional)>
```

**Types:**
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `refactor:` — code refactoring (no behavior change)
- `test:` — test additions/updates
- `chore:` — dependency updates, config changes

**Examples:**

```bash
git commit -m "feat: add job completion endpoint with auto PDF generation"
git commit -m "fix: correct inventory decrement logic in supply tracking"
git commit -m "docs: update README with API examples"
git commit -m "refactor: simplify email utility error handling"
```

## Quick Workflow

### Stage Changes
```bash
# Stage specific file
git add backend/routes/jobs.js

# Stage all changes
git add -A
```

### Check Status
```bash
git status
```

### Commit
```bash
git commit -m "type: description of what changed"

# Or with a longer message
git commit -m "feat: add support for photo uploads in job completion

- Accepts photo URL array in request body
- Stores URLs in Job model's photos field
- Displays in generated PDF report"
```

### View History
```bash
# Last 5 commits
git log --oneline -5

# Full history
git log

# See what changed in a commit
git show COMMIT_HASH
```

## Create GitHub Repository

When ready to push to GitHub:

```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/Inventory_app.git
git branch -M main
git push -u origin main
```

## Committing During Development

### Session Example
```bash
# 1. Create new endpoint for job updates
git add backend/routes/jobs.js
git commit -m "feat: add update job endpoint"

# 2. Fix a bug in PDF generation
git add backend/utils/generatePdf.js
git commit -m "fix: ensure PDF directory exists before writing"

# 3. Update docs
git add README.md
git commit -m "docs: add job update endpoint example"

# Push when session is done
git push origin main
```

## Keep It Simple

- **Frequent commits** = easy to undo, easy to review, easy to find bugs
- **Descriptive messages** = future you will thank you
- **Atomic commits** = one logical change per commit
- **Push daily** = backup to GitHub, share with team if needed

Good luck! 🚀