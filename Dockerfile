FROM ubuntu:20.04

WORKDIR /app
COPY . .

RUN apt update
RUN apt-get install -y nano wget curl
RUN apt-get install -y lsb-release
RUN apt install -y netcat
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

ARG NPM_TOKEN

RUN echo "registry=https://npm.realgrace.me" > .npmrc
RUN echo '//npm.realgrace.me/:_authToken="${NPM_TOKEN}"' >> .npmrc

RUN npm i
RUN npm run build

RUN rm .npmrc

CMD ["node", "dist/"]