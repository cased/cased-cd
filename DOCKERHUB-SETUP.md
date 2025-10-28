# DockerHub Setup for Enterprise Image Publishing

This document explains how to configure GitHub Actions to push enterprise images to DockerHub.

## Prerequisites

1. DockerHub organization: `casedimages`
2. Private repository on DockerHub: `casedimages/cased-cd-enterprise`

## Step 1: Create DockerHub Access Token

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Go to **Account Settings** → **Security** → **Access Tokens**
3. Click **"New Access Token"**
   - **Description**: `github-actions-publisher`
   - **Access permissions**: **Read, Write, Delete**
4. Copy the token (you won't see it again!)

**Token format**: `dckr_pat_xxxxxxxxxxxxxxxxxxxxx`

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repo: https://github.com/cased/cased-cd
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Add these two secrets:

### Secret 1: DOCKERHUB_USERNAME
- **Name**: `DOCKERHUB_USERNAME`
- **Value**: `casedimages`

### Secret 2: DOCKERHUB_TOKEN
- **Name**: `DOCKERHUB_TOKEN`
- **Value**: `dckr_pat_xxxxxxxxxxxxxxxxxxxxx` (your token from Step 1)

## Step 3: Verify Setup

1. Trigger a new release by pushing a tag:
   ```bash
   git tag v0.1.13
   git push origin v0.1.13
   ```

2. Check GitHub Actions: https://github.com/cased/cased-cd/actions

3. When the workflow completes, verify the image on DockerHub:
   - https://hub.docker.com/r/casedimages/cased-cd-enterprise

## Step 4: Make Repository Private on DockerHub

1. Go to https://hub.docker.com/r/casedimages/cased-cd-enterprise
2. Click **Settings** tab
3. Scroll to **Visibility Settings**
4. Select **Private**
5. Click **Save**

## Workflow Behavior

The GitHub Actions workflow will:
- ✅ Push to **GHCR** (ghcr.io/cased/cased-cd-enterprise) - private
- ✅ Push to **DockerHub** (docker.io/casedimages/cased-cd-enterprise) - private
- ✅ Tag with version, major.minor, latest
- ✅ Build for linux/amd64 and linux/arm64

## Customer Access

Once published to DockerHub, use the customer management script:

```bash
./scripts/customers/manage.sh add \
  "Customer Name" \
  "customer@email.com" \
  "dckr_pat_customer_token_here"
```

This generates installation instructions to send to the customer.

## Troubleshooting

### Workflow fails with "unauthorized: authentication required"

- **Check**: GitHub secrets are set correctly
- **Check**: Token has write permissions
- **Check**: Username is exactly `casedimages` (not `casedimages/` or with org prefix)

### Image not appearing on DockerHub

- **Check**: Repository exists: `casedimages/cased-cd-enterprise`
- **Check**: You're logged in to the correct org on DockerHub
- **Check**: Build completed successfully in GitHub Actions

### Cannot pull image from DockerHub

- **Check**: Repository is set to Private
- **Check**: Customer has valid access token
- **Check**: Customer created imagePullSecret correctly

## Security Notes

- ⚠️ Never commit the DockerHub token to git
- ⚠️ Store backups of the token in 1Password or similar
- ⚠️ Rotate the token every 6-12 months
- ⚠️ Use separate tokens for CI/CD vs customer access
