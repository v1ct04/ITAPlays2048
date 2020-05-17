FROM node:lts-alpine

WORKDIR /app/ita-plays-2048/server

COPY server/package.json server/yarn.lock ./

RUN yarn install --frozen-lockfile

COPY server/src ./src
COPY server/static ./static

CMD [ "yarn", "start:prod" ]
