#!/usr/bin/env bash
# Read-only NuruRoute handoff check. Safe to run locally or in a scheduled review.
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

echo "NuruRoute project status"
echo "Checked: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo
echo "Branch"
git status --short --branch
echo
echo "Remote"
git remote -v | awk '!seen[$0]++'
echo
echo "Recent commits"
git log --oneline -5
echo
echo "Safety: this report is read-only; it does not stage, commit, push, deploy or publish."
