#!/usr/bin/bash
set -euo pipefail

# Shell script to merge all json to games.json
# Requires jq

scriptName=$(basename "$0")

GAMES="games.json"
TMP="${GAMES}.tmp"
DIR="$PWD/public/assets/jsons"

if [[ ! -d $DIR ]]; then
  md "$DIR"
fi

for FILE in "$DIR"/*.json; do
  if [[ -f $FILE ]]; then
    jq --slurpfile update "$FILE" '
    ($update[0]) as $u |
    if any(.[]; .name == $u.name) then
      map(if .name == $u.name then . * $u else . end)
    else
      . + [$u]
    end
    ' "$GAMES" > "$TMP" && mv "$TMP" "$GAMES"
  fi
done

