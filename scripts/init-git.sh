#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <git-repo-url>"
    echo "Example: $0 https://github.com/user/acoustic-task-manager.git"
    exit 1
fi

REPO_URL="$1"

echo "🚀 Initializing Git repository..."

git init
git add .
git commit -m "Initial commit: Acoustic Task Manager microservices architecture"

git remote add origin "$REPO_URL"
git branch -M main

echo "✅ Repository initialized!"
echo "📤 Push with: git push -u origin main"
