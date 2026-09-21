# Imagem multi-stage: builda o TypeScript num estágio e roda só o
# resultado compilado + deps de produção no estágio final (imagem final
# bem menor que carregar o toolchain de build inteiro).

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 4000
# `prisma migrate deploy` só aplica migrations pendentes (é seguro/idempotente
# rodar toda vez que o container sobe) — garante que o schema do banco está
# em dia antes do processo começar a aceitar requisições.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
