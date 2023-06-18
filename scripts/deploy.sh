#!/bin/bash
set -xe

source $HOME/.cargo/env

rm -rf build
git clone https://github.com/oamaok/modulate.git build

rustup toolchain install nightly-x86_64-unknown-linux-gnu
rustup component add rust-src --toolchain nightly-x86_64-unknown-linux-gnu
rustup update
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

cd build
yarn
yarn build

cd ~
rm -rf modulate.previous
mv modulate modulate.previous
mv build modulate

cd modulate
pm2 restart ecosystem.config.js --env production