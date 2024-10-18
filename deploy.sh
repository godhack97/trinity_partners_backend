#!/bin/bash

while getopts ":n:" opt; do
  case $opt in
    n) NAME="$OPTARG";;
    \?) echo "Invalid option: -$OPTARG"; exit 1;;
  esac
done

if [ "$NAME" == "stage" ]; then
  pm2 stop pm2.config.js && \
  git pull && \
  npm run build:prod && \
  NODE_ENV=prod npm run migration:run && \
  pm2 start pm2.config.js
fi
