FROM ubuntu:20.04

WORKDIR /app
COPY . .

RUN apt update
RUN apt-get install -y nano wget curl
RUN apt-get install -y lsb-release
RUN apt install -y netcat
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

RUN npm i
RUN npm run build

CMD ["node", "dist/"]