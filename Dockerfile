FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV DB_PATH=/app/data/67bot.sqlite

CMD ["node", "index.js"]
