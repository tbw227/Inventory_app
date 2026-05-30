FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/photos && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
