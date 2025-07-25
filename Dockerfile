FROM node:20.16.0-alpine3.20

ENV RUST_TOOLCHAIN nightly-2025-01-01-x86_64-unknown-linux-musl

RUN apk add --no-cache curl build-base
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH /root/.cargo/bin:$PATH

RUN rustup toolchain install $RUST_TOOLCHAIN
RUN rustup component add rust-src --toolchain $RUST_TOOLCHAIN
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /modulate

COPY . .

RUN npm install --omit=dev
RUN npm run build

CMD ["npm", "run", "start"]
