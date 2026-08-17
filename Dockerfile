FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Dependencies first - Docker layer caching
COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Application
COPY . .

# Runtime directories
RUN mkdir -p \
    /app/uploads/candidates \
    /app/uploads_temp \
    /app/logs

# Don't run application as root
RUN addgroup -S nodeapp && \
    adduser -S nodeapp -G nodeapp && \
    chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 5005

CMD ["node", "server.js"]