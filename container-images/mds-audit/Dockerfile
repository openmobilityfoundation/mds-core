FROM node:10.16.3-alpine

RUN apk add --no-cache tini

RUN mkdir /mds

#Compile Vips and Sharp
RUN npm install sharp

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "index.js"]
