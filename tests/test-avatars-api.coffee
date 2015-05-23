assert = require "assert"
expect = require 'expect.js'
avatarsApi = require "../src/avatars-api"
supertest = require 'supertest'
fakeAuthDb = require './fake-authdb'
server = require '../src/server'
config = require '../config'
vasync = require 'vasync'
fs = require('fs')
log = require '../src/log'

describe 'Avatars API', () ->

  go = supertest.bind(supertest, server)
  authdbClient = fakeAuthDb.createClient()

  endpoint = (path) ->
    return "/#{config.routePrefix}#{path || ''}"

  users =
    'alice': {username: 'alice', token: 'alice-token'}

  filename = "./tests/image-resizer/Yoshi.png"

  before (done) ->
    #boundary = Math.random()
    #br = '\r\n'
    for own username, accountInfo of users
      authdbClient.addAccount accountInfo.token, accountInfo

    api = avatarsApi.create
      authdbClient: authdbClient

    api.addRoutes endpoint(), server
    api.initialize ->
      server.listen config.port, done

  after (done) ->
    server.close done

  describe 'POST ' + endpoint('/auth/:token/pictures'), () ->

    it 'send avatar image to server and reply with Ok', (done) ->
      @timeout 10000
      go()
        .post endpoint('/auth/alice-token/pictures')
        .attach('avatar', filename)
        .expect 200
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.an(Object)
          done()

  describe 'GET ' + endpoint('/alice/original.png'), () ->

    it 'retrieves the original image', (done) ->
      go()
        .get endpoint('/alice/original.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          expect(res.body.length).to.be(453723)
          done()

    it 'caches the results', (done) ->
      go()
        .get endpoint('/alice/original.png')
        .set 'if-none-match', 'Y'
        .expect 304
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.empty()
          done()

  describe 'GET ' + endpoint('/alice/64.png'), () ->
    it 'retrieves 64x64 resized images', (done) ->
      go()
        .get endpoint('/alice/64.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

  describe 'GET ' + endpoint('/alice/128.png'), () ->
    it 'retrieve 128x128 resized images', (done) ->
      go()
        .get endpoint('/alice/128.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

  describe 'GET ' + endpoint('/alice/256.png'), () ->
    it 'retrieve 256x256 resized images', (done) ->
      go()
        .get endpoint('/alice/256.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

# vim: ts=2:sw=2:et:
