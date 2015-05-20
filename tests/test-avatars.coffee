supertest = require 'supertest'
config = require '../config'
fakeAuthDb = require './fake-authdb'
server = require '../src/server'
avatarsApi = require '../src/avatars-api'

describe 'Avatars API', () ->
  go = supertest.bind(supertest, server)
  authdbClient = fakeAuthDb.createClient()

  users =
    'alice': {username: 'alice', token: 'alice-token'}

  endpoint = (path) ->
    "/#{config.routePrefix}#{path || ''}"

  before (cb) ->
    for own username, accountInfo of users
      authdbClient.addAccount accountInfo.token, accountInfo

    avatars = avatarsApi.create
      authdbClient: authdbClient

    avatars.addRoutes(config.routePrefix, server)
    server.listen(cb)

  after (cb) ->
    server.close(cb)

  it 'pends'
