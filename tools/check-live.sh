#!/bin/sh
# Is what was pushed really live? Compares the live site's build id (version.json, never cached)
# with the commit on origin/main, waiting up to 5 minutes for the deploy. If the deploy job is
# stuck "waiting" (it happened on Oct 6: two and a half hours, the old build live all the while),
# it says so, and how to start it again.
#   sh tools/check-live.sh
URL="https://jasondag-ai.github.io/rig-jam/version.json"
WANT=$(git rev-parse --short=7 origin/main)
i=0
while [ $i -lt 30 ]; do
  LIVE=$(curl -s "$URL?t=$(date +%s)" | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')
  if [ "$LIVE" = "$WANT" ]; then echo "LIVE: $LIVE is what was pushed."; exit 0; fi
  sleep 10; i=$((i + 1))
done
echo "NOT LIVE: the site is on $LIVE, origin/main is $WANT."
gh run list --limit 3
echo "If the newest run's deploy job is waiting: gh run cancel <id>; gh run rerun <id>"
exit 1
