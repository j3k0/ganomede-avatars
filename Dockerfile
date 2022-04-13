# Building the lwip module fails for version newer than 6.10.1
# (tested up to node:8.2.1)
FROM node:14

EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>

# Create 'app' user
RUN useradd app -d /home/app

# Install NPM packages
COPY package.json /home/app/code/package.json

WORKDIR /home/app/code
RUN npm install

# Copy app source files
COPY tsconfig.json .eslintrc .eslintignore Makefile index.ts config.ts newrelic.ts /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src
RUN chown -R app /home/app

USER app
WORKDIR /home/app/code
RUN npm run build
CMD node build/index.js

ENV NEW_RELIC_LICENSE_KEY ""
