#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if version argument is provided
if [ -z "$1" ]; then
    error "Usage: ./scripts/release.sh <version>

Example: ./scripts/release.sh 0.1.0

This will:
  1. Bump version in package.json and chart/Chart.yaml
  2. Commit version bump
  3. Create git tag v<version>
  4. Push tag to origin
  5. Create GitHub release (triggers Docker build)"
fi

VERSION=$1
TAG="v${VERSION}"

info "Starting release process for version ${VERSION}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    error "Must be on main branch to release. Current branch: ${CURRENT_BRANCH}"
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    error "Working directory is not clean. Commit or stash changes first.

$(git status --short)"
fi

# Pull latest changes
info "Pulling latest changes from origin/main..."
git pull origin main

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    error "Tag ${TAG} already exists"
fi

# Get current version from Chart.yaml to check for stale references
CURRENT_VERSION=$(grep '^version:' chart/Chart.yaml | awk '{print $2}')
info "Checking for stale version references (current: ${CURRENT_VERSION})..."

# Check main branch for old version references
OLD_REFS=""

# Check help.tsx for in-app version
HELP_VERSION=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+[^<]*' src/pages/help.tsx | head -1)
if [ "$HELP_VERSION" != "v${CURRENT_VERSION}" ]; then
    OLD_REFS="${OLD_REFS}\n  - src/pages/help.tsx: Found ${HELP_VERSION}, expected v${CURRENT_VERSION}"
fi

# Check gh-pages branch for version badge
git fetch origin gh-pages:gh-pages 2>/dev/null || true
if git show gh-pages:index.html >/dev/null 2>&1; then
    GH_PAGES_VERSION=$(git show gh-pages:index.html | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+[^<]*' | head -1)
    if [ "$GH_PAGES_VERSION" != "v${CURRENT_VERSION}" ]; then
        OLD_REFS="${OLD_REFS}\n  - gh-pages/index.html: Found ${GH_PAGES_VERSION}, expected v${CURRENT_VERSION}"
    fi
fi

# Check README for hardcoded versions (only check for very old versions, ignore preview tags)
if grep -q "0\.[0-9]\+\.[0-9]\+-preview\.[0-4]\"" README.md 2>/dev/null; then
    OLD_REFS="${OLD_REFS}\n  - README.md: Found old preview version"
fi

# If old references found, bail out
if [ -n "$OLD_REFS" ]; then
    error "Found stale version references before release:${OLD_REFS}

Please update these files to ${CURRENT_VERSION} before creating release ${VERSION}"
fi

info "✓ No stale version references found"

# Update package.json version
info "Updating package.json version to ${VERSION}..."
if command -v jq >/dev/null 2>&1; then
    # Use jq if available (preserves formatting better)
    jq ".version = \"${VERSION}\"" package.json > package.json.tmp
    mv package.json.tmp package.json
else
    # Fallback to sed
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
    rm -f package.json.bak
fi

# Update Chart.yaml versions
info "Updating chart/Chart.yaml version and appVersion to ${VERSION}..."
sed -i.bak "s/^version: .*/version: ${VERSION}/" chart/Chart.yaml
sed -i.bak "s/^appVersion: .*/appVersion: \"${VERSION}\"/" chart/Chart.yaml
rm -f chart/Chart.yaml.bak

# Update help page version
info "Updating help page version to ${VERSION}..."
sed -i.bak "s/<div className=\"text-lg font-semibold text-black dark:text-white font-mono\">v.*<\/div>/<div className=\"text-lg font-semibold text-black dark:text-white font-mono\">v${VERSION}<\/div>/" src/pages/help.tsx
rm -f src/pages/help.tsx.bak

# Verify changes
info "Version updates:"
echo "  package.json: $(grep '"version"' package.json)"
echo "  chart/Chart.yaml version: $(grep '^version:' chart/Chart.yaml)"
echo "  chart/Chart.yaml appVersion: $(grep '^appVersion:' chart/Chart.yaml)"
echo "  help.tsx: $(grep -A1 'text-lg font-semibold' src/pages/help.tsx | grep -o 'v[0-9.]*')"

# Confirm with user
echo ""
read -p "Continue with release ${VERSION}? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "Release cancelled. Reverting changes..."
    git checkout package.json chart/Chart.yaml src/pages/help.tsx
    exit 0
fi

# Commit version bump
info "Committing version bump..."
git add package.json chart/Chart.yaml src/pages/help.tsx
git commit -m "chore: bump version to ${VERSION}"

# Create and push tag
info "Creating tag ${TAG}..."
git tag -a "$TAG" -m "Release ${VERSION}"

info "Pushing commits and tags to origin..."
git push origin main
git push origin "$TAG"

# Create GitHub release
info "Creating GitHub release..."
if command -v gh >/dev/null 2>&1; then
    gh release create "$TAG" \
        --title "Release ${VERSION}" \
        --generate-notes

    info "GitHub release created successfully!"
    info "Docker images will be built automatically by GitHub Actions."
    info ""
    info "Release URLs:"
    echo "  - GitHub Release: https://github.com/cased/cased-cd/releases/tag/${TAG}"
    echo "  - Docker Image: ghcr.io/cased/cased-cd:${VERSION}"
    echo "  - Helm Chart: helm repo add cased https://cased.github.io/cased-cd"
else
    warn "GitHub CLI (gh) not found. Skipping GitHub release creation."
    warn "Create release manually at: https://github.com/cased/cased-cd/releases/new?tag=${TAG}"
fi

info "Release ${VERSION} completed successfully!"
info ""
info "Next steps:"
echo "  1. Verify Docker images built: https://github.com/cased/cased-cd/pkgs/container/cased-cd"
echo "  2. Verify Helm chart published: https://cased.github.io/cased-cd/index.yaml"
echo "  3. Test installation:"
echo "     helm repo update"
echo "     helm search repo cased/cased-cd --versions"
