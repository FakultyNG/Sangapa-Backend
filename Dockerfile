FROM node:22-alpine AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["pnpm", "start:railway"]
