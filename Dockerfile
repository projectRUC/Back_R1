# Etapa 1: Construcción (Build)
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copiar archivos de dependencias e instalar (con blindaje de red y velocidad)
COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit

# Copiar todo el código fuente y compilar
COPY . .
RUN npx prisma generate
RUN npm run build

# Etapa 2: Producción (Ligera y segura)
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Copiar solo dependencias de producción y el build compilado
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --no-audit
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Exponer el puerto por defecto de NestJS
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main"]