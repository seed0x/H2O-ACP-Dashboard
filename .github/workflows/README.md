# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for automated testing, validation, and deployment.

## Workflows

### 1. `ci.yml` - Continuous Integration
Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **api-tests**: Runs pytest test suite against PostgreSQL test database
- **api-lint**: Checks code formatting (black, isort) and linting (flake8)
- **web-build**: Runs Next.js linter, type checker, and build
- **migration-check**: Validates Alembic migrations can be applied and downgraded
- **docker-build**: Tests that Docker images build successfully

**Duration:** ~5-10 minutes

### 2. `cd.yml` - Continuous Deployment
Runs on pushes to `main` branch only.

**Jobs:**
- **deploy-render**: Triggers Render deployment (optional, requires API key)
- **notify**: Sends deployment status notification

**Setup Required:**
- Add `RENDER_API_KEY` to GitHub Secrets (Settings → Secrets → Actions)
- Add `RENDER_SERVICE_ID` to GitHub Secrets (optional, for API-triggered deploys)

**Note:** Render auto-deploys on git push, so this workflow is optional.

### 3. `pr-checks.yml` - Pull Request Validation
Runs on every pull request.

**Checks:**
- Migration conflict detection
- Large file detection
- Project structure validation

**Duration:** ~1-2 minutes

## Setup Instructions

### 1. Enable GitHub Actions
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Ensure "Allow all actions and reusable workflows" is enabled
4. Save changes

### 2. Configure Secrets (Optional - for Render deployment)
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - `RENDER_API_KEY`: Your Render API key (from https://dashboard.render.com → Account Settings → API Keys)
   - `RENDER_SERVICE_ID`: Your Render service ID (optional)

### 3. Test the Pipeline
1. Create a test branch: `git checkout -b test-ci`
2. Make a small change and commit
3. Push: `git push origin test-ci`
4. Create a pull request
5. Check the **Actions** tab to see workflows running

## Workflow Status Badge

Add this to your README.md to show CI status:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI%20Pipeline/badge.svg)
```

## Troubleshooting

### Tests Failing
- Check that test database credentials match the workflow
- Ensure all test dependencies are in `requirements.txt`
- Review test output in Actions tab

### Build Failures
- Check Dockerfile syntax
- Verify all dependencies are listed
- Review build logs for specific errors

### Migration Issues
- Ensure migrations are in correct order
- Check that `down_revision` is correct
- Verify ENUM types are handled properly (see recent fixes)

## Customization

### Adding More Tests
Edit `.github/workflows/ci.yml` and add new test steps in the appropriate job.

### Changing Deployment Target
Modify `.github/workflows/cd.yml` to deploy to different platforms (Railway, Vercel, etc.).

### Skipping CI
Add `[skip ci]` to your commit message to skip CI for that commit.

## Cost Considerations

- GitHub Actions provides 2,000 free minutes/month for private repos
- Public repos have unlimited free minutes
- Each workflow run uses ~5-10 minutes
- Monitor usage in Settings → Billing

