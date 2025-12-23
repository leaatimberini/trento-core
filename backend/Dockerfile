# --- Build Stage ---
FROM node:18-slim AS builder

# Install OpenSSL (required for Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source FIRST
COPY . .

# Generate Prisma Client with the final schema (after copying all code)
RUN npx prisma generate

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:18-slim

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Set production env
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/main"]
