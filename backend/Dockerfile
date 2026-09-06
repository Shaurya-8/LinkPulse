FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

ENV CI=true
ENV PNPM_CONFIG_STRICT_DEP_BUILDS=false
ENV PNPM_CONFIG_CONFIRM_MODULES_PURGE=false

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile --reporter=ndjson

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]