# Cache Clear Instructions

## Issue: Seeing Old Marketing Form

If you're still seeing the old "Add Account" form behavior, it's likely a caching issue.

## The Code is Correct ✅

The mapping is in place at **lines 2939-2946**:
```typescript
// Map form data to API schema
const requestBody = {
  tenant_id: 'h2o',
  channel_id: formData.channel_id,
  name: formData.account_name,           // ✅ Maps correctly
  login_email: formData.account_email,    // ✅ Maps correctly
  credential_vault_ref: formData.credential_vault_ref || null
}
```

## Solutions

### 1. Clear Browser Cache
- **Chrome/Edge**: Press `Ctrl+Shift+Delete` → Clear cached images and files
- **Or**: Hard refresh with `Ctrl+Shift+R` or `Ctrl+F5`
- **Or**: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### 2. Check Vercel Deployment
- Go to your Vercel dashboard
- Check if the latest commit (7176256) is deployed
- If not, trigger a redeploy or wait for auto-deploy

### 3. Verify in Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Try submitting the form
4. Check the request payload - it should show:
   ```json
   {
     "tenant_id": "h2o",
     "channel_id": "...",
     "name": "...",           // ✅ Should be "name", not "account_name"
     "login_email": "...",    // ✅ Should be "login_email", not "account_email"
     "credential_vault_ref": "..."
   }
   ```

### 4. Check Source Code
- View page source or check Network → Response
- Look for the comment `// Map form data to API schema` around line 2939
- If you don't see it, the old code is still deployed

## What Should Work

When you submit the form:
- ✅ Form fields can still say "Account Name" and "Account Email" (UI labels)
- ✅ But the API request should send `name` and `login_email`
- ✅ Channel dropdown should show `display_name` from API
- ✅ Account list should display `account.name` from API response

## If Still Not Working

1. Check Vercel deployment logs
2. Verify the commit is pushed: `git log -1`
3. Force Vercel redeploy from dashboard
4. Clear browser cache completely
5. Try incognito/private browsing mode


