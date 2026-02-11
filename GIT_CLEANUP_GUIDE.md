# Git Repository Cleanup Guide

## Your Current Situation

You have a Git repository with the MISRA platform code that's been committed. Now you want to start fresh with a Web Application Testing System.

---

## Option 1: Keep MISRA Code in a Branch (RECOMMENDED)

This preserves your work while starting fresh on the new system.

### Steps:

1. **Create a backup branch for MISRA code**
```powershell
# In Git Desktop or PowerShell
git checkout -b misra-platform-backup
git push origin misra-platform-backup
```

2. **Go back to main branch**
```powershell
git checkout main
```

3. **Delete all MISRA-related files (keep infrastructure)**
```powershell
# Delete MISRA-specific files but keep git, node_modules structure
Remove-Item -Recurse -Force packages/backend/src/services/misra
Remove-Item -Recurse -Force packages/backend/src/functions/ai
Remove-Item -Recurse -Force packages/backend/src/config/misra-rules-config.ts
# ... continue for other MISRA-specific files
```

4. **Commit the cleanup**
```powershell
git add .
git commit -m "Clean up MISRA platform code, preparing for Web App Testing System"
git push origin main
```

---

## Option 2: Start Completely Fresh (New Repository)

Create a brand new repository for the Web App Testing System.

### Steps:

1. **In GitHub/GitLab, create a new repository**
   - Name: `web-app-testing-system`
   - Don't initialize with README

2. **In your local machine, create new directory**
```powershell
cd D:\Code
mkdir web-app-testing-system
cd web-app-testing-system
```

3. **Initialize new Git repository**
```powershell
git init
git remote add origin <your-new-repo-url>
```

4. **Copy only what you need from old project**
```powershell
# Copy infrastructure setup files
Copy-Item D:\Code\misra-testing\.gitignore .
Copy-Item D:\Code\misra-testing\package.json .
# Don't copy the MISRA-specific code
```

5. **Make initial commit**
```powershell
git add .
git commit -m "Initial commit: Web App Testing System"
git push -u origin main
```

---

## Option 3: Clean Current Repository (Keep Git History)

Remove MISRA code but keep the Git repository and commit history.

### Steps Using Git Desktop:

1. **Open Git Desktop**
   - Select your repository

2. **Create a new branch**
   - Branch → New Branch
   - Name: `web-app-testing-system`
   - Create from: `main`

3. **Delete unwanted files**
   - In File Explorer, delete MISRA-specific files
   - Keep: `.git`, `.gitignore`, `package.json`, infrastructure files

4. **In Git Desktop**
   - You'll see all deleted files in "Changes"
   - Add a commit message: "Remove MISRA platform, prepare for Web App Testing"
   - Click "Commit to web-app-testing-system"

5. **Push to remote**
   - Click "Publish branch" or "Push origin"

6. **Make this the main branch** (optional)
   - Branch → Merge into current branch → Select `main`
   - Or in GitHub, change default branch to `web-app-testing-system`

---

## Option 4: Archive MISRA, Start Fresh in Same Repo

Keep MISRA code in a tag/release, then clean the main branch.

### Steps:

1. **Create a release/tag for MISRA code**
```powershell
git tag -a misra-v1.0 -m "MISRA Platform - Final Version"
git push origin misra-v1.0
```

2. **Delete all files except infrastructure**
```powershell
# Keep only:
# - .git/
# - .gitignore
# - package.json
# - README.md (update it)
# - node_modules/ (will be regenerated)

# Delete everything else
Remove-Item -Recurse -Force packages
Remove-Item -Force *.ps1
Remove-Item -Force *.md (except README.md)
```

3. **Commit the cleanup**
```powershell
git add .
git commit -m "Archive MISRA platform (see tag misra-v1.0), start Web App Testing System"
git push origin main
```

---

## Recommended Approach for Your Situation

I recommend **Option 1** (Keep MISRA in a branch) because:
- ✅ Preserves all your MISRA work
- ✅ Easy to reference or restore if needed
- ✅ Clean main branch for new system
- ✅ Can merge useful infrastructure code later

---

## Step-by-Step: Option 1 in Git Desktop

### 1. Create Backup Branch

**In Git Desktop:**
1. Click "Current Branch" dropdown at top
2. Click "New Branch"
3. Name it: `misra-platform-backup`
4. Click "Create Branch"
5. Click "Publish branch" to push to GitHub

### 2. Switch Back to Main

1. Click "Current Branch" dropdown
2. Select `main`

### 3. Delete MISRA Files

**In File Explorer (D:\Code\misra-testing):**

Delete these files/folders:
```
✗ packages/backend/src/services/misra/
✗ packages/backend/src/functions/ai/
✗ packages/backend/src/config/misra-rules-config.ts
✗ packages/backend/src/types/misra-rules.ts
✗ All *.md files (except README.md)
✗ All test-*.ps1 files
✗ All check-*.ps1 files
✗ All diagnose-*.ps1 files
✗ All deploy-*.ps1 files
✗ .kiro/specs/misra-web-testing-platform/
```

Keep these:
```
✓ .git/
✓ .gitignore
✓ package.json
✓ packages/backend/src/infrastructure/ (reusable)
✓ packages/backend/src/database/ (reusable)
✓ packages/backend/src/functions/auth/ (reusable)
✓ packages/backend/src/functions/file/ (reusable)
✓ packages/frontend/src/ (will modify)
✓ node_modules/ (will regenerate)
```

### 4. Commit Changes in Git Desktop

1. Git Desktop will show all deleted files
2. In the "Summary" field, type:
   ```
   Clean up MISRA platform code
   
   - Moved MISRA code to misra-platform-backup branch
   - Preparing repository for Web App Testing System
   - Kept reusable infrastructure components
   ```
3. Click "Commit to main"
4. Click "Push origin"

### 5. Update README

Create a new README.md:
```markdown
# Web Application Testing System

A comprehensive platform for automated web application testing.

## Previous Version
The MISRA C/C++ Code Analysis Platform is preserved in the `misra-platform-backup` branch.

## Getting Started
Coming soon...
```

### 6. Commit README

1. In Git Desktop, you'll see README.md changed
2. Summary: "Update README for Web App Testing System"
3. Commit and push

---

## Deleting Git Tags (If You Have Any)

### List all tags:
```powershell
git tag
```

### Delete local tag:
```powershell
git tag -d <tag-name>
```

### Delete remote tag:
```powershell
git push origin --delete <tag-name>
```

### Example:
```powershell
# Delete tag named "v1.0"
git tag -d v1.0
git push origin --delete v1.0
```

---

## Clean Up Untracked Files

### See what will be deleted:
```powershell
git clean -n
```

### Delete untracked files:
```powershell
git clean -f
```

### Delete untracked files AND directories:
```powershell
git clean -fd
```

---

## Reset to Previous Commit (If Needed)

### See commit history:
```powershell
git log --oneline
```

### Reset to specific commit (keep changes):
```powershell
git reset --soft <commit-hash>
```

### Reset to specific commit (discard changes):
```powershell
git reset --hard <commit-hash>
```

### Push force (CAREFUL!):
```powershell
git push origin main --force
```

---

## My Recommendation

**Do this:**

1. **Backup first** (create `misra-platform-backup` branch)
2. **Clean main branch** (delete MISRA-specific files)
3. **Keep infrastructure** (auth, database, file handling - reusable!)
4. **Start building** Web App Testing System on clean main branch

This way:
- Your MISRA work is safe in a branch
- Main branch is clean for new system
- You can reuse infrastructure code
- Easy to show both projects to your team

---

## Quick Commands Summary

```powershell
# 1. Create backup branch
git checkout -b misra-platform-backup
git push origin misra-platform-backup

# 2. Go back to main
git checkout main

# 3. Delete files in File Explorer (manually)

# 4. Commit cleanup
git add .
git commit -m "Clean up for Web App Testing System"
git push origin main

# 5. Verify branches
git branch -a
```

---

## Need Help?

If you want me to:
1. Create a script to automate the cleanup
2. Help identify which files to keep/delete
3. Set up the new project structure

Just let me know!
