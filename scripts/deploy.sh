#!/bin/bash
set -xe

rm -rf build
git clone https://github.com/oamaok/modulate.git build

cd build
yarn
yarn build

cd ~
rm -rf modulate.previous
mv modulate modulate.previous
mv build modulate

cd modulate
pm2 restart ecosystem.config.js --env production