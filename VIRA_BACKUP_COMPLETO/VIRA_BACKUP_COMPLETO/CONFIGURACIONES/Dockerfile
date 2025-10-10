
# Multi-stage build para optimizar tamaño de imagen
FROM node:18-alpine AS deps

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Instalar dependencias
RUN yarn install --frozen-lockfile --production=false

# ================================
# Build stage
# ================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Variables de entorno para build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generar Prisma client (si se usa)
# RUN npx prisma generate

# Build de la aplicación
RUN yarn build

# ================================
# Production stage
# ================================
FROM node:18-alpine AS runner

WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copiar build de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Instalar dependencias de producción únicamente
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Crear directorio para logs
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]
