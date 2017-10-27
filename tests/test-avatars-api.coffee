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
  bansClient = {
    _nCalls: 0
    _callArgs: []
    isBanned: (username, callback) ->
      ++@_nCalls
      @_callArgs.push(username)
      banned = username.indexOf('banned-') == 0
      process.nextTick(() -> callback(null, banned))
  }

  endpoint = (path) ->
    return "/#{config.routePrefix}#{path || ''}"

  users =
    'alice': {username: 'alice', token: 'alice-token'}
    'banned-joe': {username: 'banned-joe', token: 'banned-joe-token'}

  filename = "./tests/image-resizer/Yoshi.png"

  before (done) ->
    #boundary = Math.random()
    #br = '\r\n'
    for own username, accountInfo of users
      authdbClient.addAccount accountInfo.token, accountInfo

    api = avatarsApi.create({
      authdbClient: authdbClient,
      bansClient
    })

    api.addRoutes endpoint(), server
    api.initialize ->
      server.listen config.port, done

  after (done) ->
    server.close done

  describe 'POST ' + endpoint('/auth/:token/pictures'), () ->

    it 'handles image upload', (done) ->
      go()
        .post endpoint('/auth/alice-token/pictures')
        .attach('avatar', filename)
        .expect 200
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.an(Object)
          expect(res.body.url).to.be(undefined)
          done()

    it 'allows to replace the picture', (done) ->
      go()
        .post endpoint('/auth/alice-token/pictures')
        .attach('avatar', filename)
        .expect 200
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.an(Object)
          expect(res.body.url).to.be(undefined)
          done()

  describe 'GET ' + endpoint('/alice/original.png'), () ->
    etag = null

    it 'retrieves the original image', (done) ->
      go()
        .get endpoint('/alice/original.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          expect(res.body.length).to.be(453723)
          expect(res.header.etag).not.to.be.empty()
          etag = res.header.etag
          done()

    it 'caches the results', (done) ->
      go()
        .get endpoint('/alice/original.png')
        .set 'if-none-match', etag
        .expect 304
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.empty()
          done()

    it 'expects the right revision for caching', (done) ->
      go()
        .get endpoint('/alice/original.png')
        .set 'if-none-match', 'wrong-etag'
        .expect 200
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          expect(res.body.length).to.be(453723)
          expect(res.header.etag).not.to.be.empty()
          done()

    it 'fails with 404', (done) ->
      go()
        .get endpoint('/bob/original.png')
        .set 'if-none-match', etag
        .expect 404
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body.code).to.be('NotFoundError')
          done()

  describe 'GET ' + endpoint('/alice/#{size}.png'), () ->
    it 'retrieves 64x64 resized images', (done) ->
      go()
        .get endpoint('/alice/64.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

    it 'retrieve 128x128 resized images', (done) ->
      go()
        .get endpoint('/alice/128.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

    it 'retrieve 256x256 resized images', (done) ->
      go()
        .get endpoint('/alice/256.png')
        .expect 200
        .expect 'Content-Type', 'image/png'
        .end (err, res) ->
          expect(err).to.be(null)
          expect(res.body).to.be.a(Buffer)
          done()

    it 'calls bansClient to check for bans', () ->
      assert(bansClient._nCalls == 7)
      assert.deepEqual(bansClient._callArgs, [
        'alice', 'alice', 'alice',
        'bob',
        'alice', 'alice', 'alice'
      ])

    it 'fake bans client retursn false for alice', (done) ->
      bansClient.isBanned 'alice', (err, banned) ->
        assert(err == null)
        assert(banned == false)
        done()

    it 'fake bans client retursn true for banned-joe', (done) ->
      bansClient.isBanned 'banned-joe', (err, banned) ->
        assert(err == null)
        assert(banned == true)
        done()

    it 'banned users are 404', (done) ->
      go()
        .get(endpoint('/banned-joe/256.png'))
        .expect(404)
        .end(done)

# vim: ts=2:sw=2:et:
