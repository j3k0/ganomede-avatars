log = require "./log"
aboutApi = require "./about-api"
pingApi = require "./ping-api"
avatarsApi = require "./avatars-api"
bans = require "./bans"
api = null

addRoutes = (prefix, server) ->
  log.info "adding routes to #{prefix}"

  # Platform Availability
  pingApi.addRoutes prefix, server

  # About
  aboutApi.addRoutes prefix, server

  # Avatar
  api.addRoutes prefix, server

initialize = (callback) ->
  log.info "initializing backend"
  bansClient = bans.createClient(process.env, log)
  api = avatarsApi.create({bansClient})
  api.initialize callback

destroy = ->
  log.info "destroying backend"
  api = null

module.exports =
  initialize: initialize
  destroy: destroy
  addRoutes: addRoutes
  log: log

# vim: ts=2:sw=2:et:
