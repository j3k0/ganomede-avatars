FROM node:0.10.38-slim
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>
EXPOSE 8000

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install python make g++
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install git
RUN rm -rf /var/lib/apt/lists/*
RUN useradd app -d /home/app

WORKDIR /home/app/code
COPY package.json /home/app/code/package.json
RUN chown -R app /home/app

USER app
RUN npm install

COPY .eslintrc .eslintignore coffeelint.json Makefile index.js config.js /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src

USER root
RUN chown -R app /home/app

ENV "CDN_HOST="

WORKDIR /home/app/code
USER app
RUN make check
CMD node_modules/.bin/forever index.js
