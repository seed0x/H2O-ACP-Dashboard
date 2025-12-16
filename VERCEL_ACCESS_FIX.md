  # Fix Vercel Git Author Access Issue

## 🔍 Problem

Vercel error: "Git author vladpnw must have access to the project on Vercel to create deployments"

This happens when the Git commit author doesn't have access to the Vercel project.

---

## ✅ Solution Options

### Option 1: Add User to Vercel Project (Recommended)

If `vladpnw` is a different person/account:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `H2O-ACP-Dashboard` (or your project name)
3. **Go to Settings** → **Team** (or **Members**)
4. **Click "Invite"** or **"Add Member"**
5. **Enter the GitHub username**: `vladpnw`
6. **Or enter email**: `vlad.pnw@gmail.com`
7. **Grant access** (Admin or Member role)
8. **The user must accept the invitation**

After adding, Vercel will automatically deploy on the next push.

---

### Option 2: Change Git Author to Your Vercel Account

If you want to use your own Vercel account for commits:

1. **Find your Vercel account email:**
   - Go to Vercel Dashboard → Settings → Profile
   - Check your email address

2. **Update Git config:**
   ```bash
   git config user.name "Your Name"
   git config user.email "your-vercel-email@example.com"
   ```

3. **Amend the last commit:**
   ```bash
   git commit --amend --author="Your Name <your-vercel-email@example.com>" --no-edit
   ```

4. **Force push (if needed):**
   ```bash
   git push --force-with-lease origin main
   ```

---

### Option 3: Disable Git Author Check in Vercel

If you're the project owner and want to allow any Git author:

1. **Go to Vercel Dashboard** → **Your Project** → **Settings**
2. **Go to "Git"** section
3. **Look for "Deploy Hooks"** or **"Build & Development Settings"**
4. **Disable "Require Git Author Access"** (if available)
   - Note: This option may not be available in all Vercel plans

---

### Option 4: Use Vercel CLI to Deploy

Bypass Git integration and deploy directly:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Link project:**
   ```bash
   vercel link
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

This deploys directly without checking Git author.

---

## 🎯 Quick Fix (Most Common)

**If `vladpnw` is you or a team member:**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Team/Members
4. Add `vladpnw` (GitHub username) or `vlad.pnw@gmail.com` (email)
5. They accept invitation
6. Push again or wait for auto-deploy

---

## 🔧 Alternative: Update Last Commit Author

If you want to change the author of the last commit to match your Vercel account:

```bash
# Check your Vercel account email (from Vercel dashboard)
# Then update git config
git config user.name "Your Vercel Name"
git config user.email "your-vercel-email@example.com"

# Amend last commit
git commit --amend --reset-author --no-edit

# Push
git push --force-with-lease origin main
```

---

## ✅ After Fixing

1. **Verify access** - User should appear in Vercel project members
2. **Trigger deployment** - Either:
   - Push a new commit
   - Or use Vercel dashboard → Deployments → Redeploy
3. **Check deployment** - Should now work without author errors

---

**Which option do you want to use?** The most common fix is Option 1 (adding the user to the Vercel project).

