FROM node:6.10.1

EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>

# Create 'app' user
RUN useradd app -d /home/app
WORKDIR /home/app/code

# Install NPM packages
COPY package.json /home/app/code/package.json
RUN chown -R app /home/app
RUN npm install --production

# Copy app source files
COPY .eslintrc .eslintignore coffeelint.json Makefile index.js config.js newrelic.js /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src
RUN chown -R app /home/app

USER app

WORKDIR /home/app/code
CMD node index.js

ENV "CDN_HOST=" \
    "NEW_RELIC_LICENSE_KEY="

