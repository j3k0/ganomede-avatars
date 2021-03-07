'use strict';

const url = require('url');
const pkg = require('./package.json');

module.exports = {
  port: +process.env.PORT || 8000,
  routePrefix: process.env.ROUTE_PREFIX || pkg.api,

  http: {
    port: +process.env.PORT || 8000,
    prefix: process.env.ROUTE_PREFIX || pkg.api,
  },

  couch: {
    serverUri: url.format({
      protocol: 'http',
      auth: process.env.COUCH_AVATARS_PORT_5984_TCP_AUTH || undefined,
      hostname: process.env.COUCH_AVATARS_PORT_5984_TCP_ADDR || 'localhost',
      port: +process.env.COUCH_AVATARS_PORT_5984_TCP_PORT || 5984
    }),

    // This is database name. Default one is test database, so we won't
    // drop production data by accidentally running tests.
    name: process.env.COUCH_AVATARS_DB_NAME || 'ganomede_avatars_test',
    designName: 'avatar'
  },

  rules: {
    host: process.env.RULES_PORT_8080_TCP_ADDR || 'localhost',
    port: +process.env.RULES_PORT_8080_TCP_PORT || 8080
  },

  authdb: {
    host: process.env.REDIS_AUTH_PORT_6379_TCP_ADDR || 'localhost',
    port: +process.env.REDIS_AUTH_PORT_6379_TCP_PORT || 6379
  },

  redis: {
    host: process.env.REDIS_GAMES_PORT_6379_TCP_ADDR || 'localhost',
    port: +process.env.REDIS_GAMES_PORT_6379_TCP_PORT || 6379,
    prefix: pkg.api
  }
  // COUCH_GAMES_PORT_5984_TCP_ADDR - IP of the games couchdb
  // COUCH_GAMES_PORT_5984_TCP_PORT
};
