FROM node:10.16.3-alpine

RUN apk add --no-cache tini postgresql-client

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "index.js"]
