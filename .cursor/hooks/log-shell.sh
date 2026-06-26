#!/bin/bash
input=$(cat)
command=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))")
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "$timestamp  $command" >> .cursor/hooks/shell-audit.log
exit 0
