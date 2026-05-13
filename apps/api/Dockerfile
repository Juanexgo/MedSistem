FROM node:20-alpine AS base
RUN npm install -g npm@11
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm install

FROM base AS development
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=apps/api"]

FROM base AS production
COPY . .
RUN npm run build --workspace=apps/api
EXPOSE 4000
CMD ["node", "apps/api/dist/main"]
