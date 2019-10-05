FROM node:8-alpine

RUN apk add --no-cache tini postgresql-client

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "index.js", "--type=trip"]