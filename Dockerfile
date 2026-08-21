FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json package-lock.json tsconfig.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/

# Install dependencies
RUN npm ci

# Copy all source files
COPY packages/ packages/
COPY apps/server/ apps/server/
COPY apps/mobile/ apps/mobile/

# Build monorepo packages and export web app
RUN npm run build --workspaces --if-present
RUN cd apps/mobile && npx expo export --platform web

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

COPY --from=builder /app /app

EXPOSE 5001

CMD ["npm", "run", "start", "--workspace=apps/server"]
