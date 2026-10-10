#!/bin/sh
# THE DEV LANE: pushes branch `next` to the dev repo (jasondag-ai/rig-jam-next, as its main) and waits until the
# dev site's build id is that commit. The dev copy is https://jasondag-ai.github.io/rig-jam-next/ ; the live game
# (/rig-jam/, built from this repo's main) is never touched by this.
#   sh tools/push-dev.sh
set -e
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "next" ]; then echo "NOT PUSHED: this is branch '$BRANCH'. The dev lane is branch 'next' (~/Rig-Jam-next)."; exit 1; fi
if ! git remote get-url dev >/dev/null 2>&1; then git remote add dev https://github.com/jasondag-ai/rig-jam-next.git; fi
git push dev next:main
git push origin next 2>/dev/null || true
URL="https://jasondag-ai.github.io/rig-jam-next/version.json"
WANT=$(git rev-parse --short=7 HEAD)
i=0
while [ $i -lt 30 ]; do
  BODY=$(curl -s "$URL?t=$(date +%s)")
  LIVE=$(echo "$BODY" | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')
  if [ "$LIVE" = "$WANT" ]; then
    case "$BODY" in *'"channel":"dev"'*) echo "DEV: $LIVE is what was pushed (https://jasondag-ai.github.io/rig-jam-next/)."; exit 0;; esac
    echo "WRONG CHANNEL: $LIVE is up at the dev address but is not a dev build ($BODY)."; exit 1
  fi
  sleep 10; i=$((i + 1))
done
echo "NOT UP: the dev site is on '$LIVE', branch next is $WANT."
gh run list --repo jasondag-ai/rig-jam-next --limit 3
echo "If the newest run's deploy job is waiting: gh run cancel <id> --repo jasondag-ai/rig-jam-next; gh run rerun <id> --repo jasondag-ai/rig-jam-next"
exit 1
