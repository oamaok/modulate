#!/bin/bash
set -xe

source $HOME/.cargo/env

rm -rf build
git clone https://github.com/oamaok/modulate.git build

cd build
npm install
cp -R ~/dist/dist ./dist

cd ~
rm -rf modulate.previous
mv modulate modulate.previous
mv build modulate

cd modulate
pm2 restart ecosystem.config.js --env production