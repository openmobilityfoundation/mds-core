FROM node:10.16.3-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "metrics-log.js"]
