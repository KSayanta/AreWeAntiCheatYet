#!/usr/bin/bash
set -euo pipefail

# Shell script to download an issue from this repo as a markdown file
# Requires gh-cli

scriptName=$(basename "$0")

REPO="AreWeAntiCheatYet/AreWeAntiCheatYet"

if [ $# -lt 1 ]; then
  echo "Error: Not enough arguments"
  echo "Usage: ${scriptName} <issue_numbers_separated_by_space>"
  echo "i.e. ${scriptName} 1234 8909 1111"
  echo " "
  exit 1
fi


ISSUES=($@)
DIR="$PWD/public/assets/issues/"

if [[ ! -d $DIR ]]; then
  md "$DIR"
fi

for issue in "${ISSUES[@]}"; do
  $(gh api repos/${REPO}/issues/${issue} --jq '.body' >> "${DIR}${issue}".md)
done

