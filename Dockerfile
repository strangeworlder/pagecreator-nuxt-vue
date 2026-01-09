# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate && apk add --no-cache libc6-compat imagemagick libwebp-tools

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile || pnpm install

FROM deps AS build-ssr
COPY . .
ENV NODE_ENV=production
RUN pnpm build

FROM deps AS build-static
COPY . .
ENV NODE_ENV=production
RUN pnpm generate

FROM node:20-alpine AS runner-ssr
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
RUN apk add --no-cache imagemagick libwebp-tools
COPY --from=build-ssr /app/.output ./.output
COPY --from=build-ssr /app/content ./content
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

FROM nginx:1.27-alpine AS runner-static
COPY --from=build-static /app/.output/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


