#!/usr/bin/env bash
#
# Push this project to GitHub.
#
# Usage (from the project root):
#   GIT_NAME="Manav" GIT_EMAIL="you@example.com" ./scripts/push-to-github.sh
#
# Optional environment variables:
#   REPO_URL   default https://github.com/Manav32478/Gallops-Restaurant.git
#   BRANCH     default main
#   COMMIT_MSG default "Gallops OS — QR ordering & restaurant management platform"
#   FORCE=1    force-push (only if you are sure the remote copy is disposable)
#
# Authentication:
#   HTTPS → GitHub asks for a username and a Personal Access Token (PAT) as the
#           password. Create one at GitHub → Settings → Developer settings →
#           Personal access tokens → Fine-grained (Contents: Read and write) or
#           Classic (scope: repo).
#   SSH   → set REPO_URL=git@github.com:Manav32478/Gallops-Restaurant.git
#           and add your key at GitHub → Settings → SSH and GPG keys.
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Manav32478/Gallops-Restaurant.git}"
BRANCH="${BRANCH:-main}"
COMMIT_MSG="${COMMIT_MSG:-Gallops OS — QR ordering & restaurant management platform}"
FORCE="${FORCE:-0}"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is not installed."

# ---------------------------------------------------------------- 1. repository
if [ ! -d .git ]; then
  say "Initialising a new repository"
  git init
else
  say "Using the existing repository"
fi

# ------------------------------------------------------------------ 2. identity
if [ -z "$(git config user.name || true)" ] || [ -z "$(git config user.email || true)" ]; then
  if [ -n "${GIT_NAME:-}" ] && [ -n "${GIT_EMAIL:-}" ]; then
    git config user.name "$GIT_NAME"
    git config user.email "$GIT_EMAIL"
  else
    die "No git identity set. Re-run with:
       GIT_NAME=\"Your Name\" GIT_EMAIL=\"you@example.com\" ./scripts/push-to-github.sh
     or set it once globally:
       git config --global user.name \"Your Name\"
       git config --global user.email \"you@example.com\""
  fi
fi
say "Committing as $(git config user.name) <$(git config user.email)>"

# --------------------------------------------------------------------- 3. stage
say "Staging files (node_modules, .next and .env are gitignored)"
git add -A

STAGED="$(git diff --cached --name-only)"
[ -n "$STAGED" ] || die "Nothing staged — is the project directory empty?"

# safety net: never upload secrets or build output
for forbidden in ".env" "node_modules/" ".next/" "tsconfig.tsbuildinfo"; do
  if printf '%s\n' "$STAGED" | grep -qF "$forbidden"; then
    git reset -q
    die "Refusing to commit: '$forbidden' is staged. Fix .gitignore and try again."
  fi
done

# -------------------------------------------------------------------- 4. commit
if git diff --cached --quiet; then
  say "Nothing to commit — working tree already clean"
else
  git commit -q -m "$COMMIT_MSG"
  say "Created commit $(git rev-parse --short HEAD) with $(printf '%s\n' "$STAGED" | wc -l | tr -d ' ') files"
fi

git branch -M "$BRANCH"

# --------------------------------------------------------------------- 5. remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
  say "Remote 'origin' pointed at $REPO_URL"
else
  git remote add origin "$REPO_URL"
  say "Added remote 'origin' → $REPO_URL"
fi

# ---------------------------------------------------------------- 6. sync + push
say "Fetching the remote"
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  if [ "$FORCE" = "1" ]; then
    say "Force-pushing (FORCE=1) — remote history on $BRANCH will be replaced"
    git push --force -u origin "$BRANCH"
  else
    say "Remote already has a $BRANCH branch — merging it first (unrelated histories allowed)"
    git fetch origin "$BRANCH"
    if ! git merge --allow-unrelated-histories -m "Merge existing remote $BRANCH" "origin/$BRANCH"; then
      die "Merge conflict. Resolve it, then run:
       git add -A && git commit && git push -u origin $BRANCH"
    fi
    git push -u origin "$BRANCH"
  fi
else
  say "Pushing to a new $BRANCH branch"
  git push -u origin "$BRANCH"
fi

say "Done — open https://github.com/Manav32478/Gallops-Restaurant"
