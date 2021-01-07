FROM node:14.2.0-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

#Compile Vips and Sharp
RUN npm install sharp

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "--experimental-repl-await", "server.js"]
