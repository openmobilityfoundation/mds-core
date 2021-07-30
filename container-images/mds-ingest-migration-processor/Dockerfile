FROM node:15.11.0-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "--experimental-repl-await", "processor.js"]
