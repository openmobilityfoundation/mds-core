FROM node:12.14.1-alpine


RUN apk add --no-cache tini

RUN mkdir /mds

#Compile Vips and Sharp
RUN npm install sharp

COPY dist/* /mds/

WORKDIR /mds

ENTRYPOINT ["/sbin/tini", "node", "--no-deprecation", "server.js"]
