#!/bin/bash
cd ~/modulate
git fetch origin main
git reset --hard origin/main
yarn
yarn build
yarn run-migrations
pm2 restart ecosystem.config.js