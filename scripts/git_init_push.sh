#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <git-repo-url>"
  echo "Example: $0 https://github.com/user/acoustic-task-manager.git"
  exit 1
fi

REPO_URL="$1"

echo "🚀 Initializing Git repository..."

cd "$(dirname "$0")/.."

# Initialize git if not already
if [ ! -d ".git" ]; then
  git init
fi

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Acoustic Task Manager - Production-ready microservices architecture" || echo "Nothing to commit"

# Add remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Set default branch
git branch -M main 2>/dev/null || true

echo "✅ Repository initialized!"
echo ""
echo "📤 Push with:"
echo "  git push -u origin main"
echo ""
echo "Or push now? (y/n)"
read -r response
if [ "$response" = "y" ]; then
  git push -u origin main
fi
