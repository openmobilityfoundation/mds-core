FROM node:8-alpine

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["node", "server.js"]
