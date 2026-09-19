#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 server.py --open
else
  echo 'Python 3 is not installed. Open Context-Lab.html directly in Chrome or Edge.'
  read -r answer
fi
