# Change Git Author to Your Other Account

## Quick Steps

### 1. Update Git Config

```bash
git config user.name "Your Other Account Name"
git config user.email "your-other-account@email.com"
```

### 2. Amend Last Commit

```bash
git commit --amend --reset-author --no-edit
```

### 3. Force Push (Safely)

```bash
git push --force-with-lease origin main
```

---

## Or Set Globally

If you want this for all repos:

```bash
git config --global user.name "Your Other Account Name"
git config --global user.email "your-other-account@email.com"
```

Then amend and push as above.

---

**Ready?** Just tell me your other account's name and email, and I'll update it for you!

