log = require "./log"
aboutApi = require "./about-api"
pingApi = require "./ping-api"
avatarsApi = require "./avatars-api"
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
  api = avatarsApi.create()
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
