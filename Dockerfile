FROM node:17.4.0-alpine3.14

WORKDIR /app

COPY . /app/

RUN cd /app \
    && npm install

CMD ["npm", "run", "start"]