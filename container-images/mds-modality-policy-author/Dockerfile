FROM node:14.2.0-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "server.js"]
