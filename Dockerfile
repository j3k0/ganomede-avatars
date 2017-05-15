FROM node:0.10.46-slim
EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>
RUN useradd app -d /home/app
WORKDIR /home/app/code
COPY package.json /home/app/code/package.json
RUN chown -R app /home/app

USER app
RUN npm install

COPY .eslintrc .eslintignore coffeelint.json Makefile index.js config.js newrelic.js /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src

USER root
RUN chown -R app /home/app

ENV "CDN_HOST=" \
    "NEW_RELIC_LICENSE_KEY="

WORKDIR /home/app/code
USER app
RUN make check
CMD node index.js
