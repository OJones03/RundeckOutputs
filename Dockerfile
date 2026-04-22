# ── Stage 1: Build the React frontend ────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY package.json package-lock.json* ./
RUN npm ci --silent

COPY . .
RUN npm run build          # output → /frontend/dist


# ── Stage 2: Install server dependencies ─────────────────────────
FROM node:20-alpine AS server-builder

WORKDIR /server

COPY server/package.json ./
RUN npm install --production --silent


# ── Stage 3: Final runtime image ─────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy Express server
COPY server/index.js ./

# Copy server node_modules from stage 2
COPY --from=server-builder /server/node_modules ./node_modules

# Copy the built React app — Express will serve it as static files
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 3001

ENV STATIC_DIR=/app/public \
    DATA_DIR=/data \
    AUTH_USERNAME=admin \
    AUTH_PASSWORD=admin \
    JWT_SECRET=change-me-in-production

CMD ["node", "index.js"]
