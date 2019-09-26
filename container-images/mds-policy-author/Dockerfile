FROM node:8-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "index.js"]
