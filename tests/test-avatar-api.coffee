assert = require "assert"
expect = require 'expect.js'
avatarsApi = require "../src/avatars-api"
supertest = require 'supertest'
server = require '../src/server'
config = require '../config'
vasync = require 'vasync'
fs = require('fs')


endpoint = (path) ->
  return "/#{config.routePrefix}#{path || ''}"

go = supertest.bind(supertest, server)
boundary = Math.random()
filename = "./tests/none.jpg"
br = '\r\n'

before (done) ->
  api = avatarsApi.create()
  api.addRoutes endpoint(), server

  vasync.parallel
    funcs: [
      server.listen.bind(server, config.port)
    ], done

after (done) ->
  vasync.parallel
    funcs: [
      server.close()
    ], done

describe 'POST ' + endpoint('/auth/:token/pictures'), () ->
  it 'send avatar image to server and reply with Ok', (done) ->
    go()
      .post endpoint('/auth/:username/pictures')
      .set('Content-Type', 'multipart/form-data; boundary="' + boundary + '"')
      .send('--' + boundary + br)
      .send('Content-Disposition: form-data; name="image"; filename="'+
        filename + '"' + br)
      .send('Content-Type: image/png' + br)
      .send(br)
      .send(fs.readFileSync(filename))
      # .send('--' + boundary + br)
      # .send('Content-Disposition: form-data; name="myJson"' + br)
      # .send('Content-Type: application/json' + br)
      # .send(br)
      # .send user:{ username: "test"}
      .send(br + '--' +  boundary + '--')
      .expect 200
      .end (err, res) ->
        console.log res.body
        expect(err).to.be(null)
        expect(res.body).to.be.an(Object)
        done()



describe 'GET ' + endpoint('/:username/size/:size'), () ->
  it 'send get request to server and reply with image', (done) ->
    go()
      .get endpoint('/:username/size/:size')
      .expect 200
      .end (err, res) ->
        console.log res.body
        expect(err).to.be(null)
        expect(res.body).to.be.an(Object)
        done()

###describe "avatar-api", ->

  before ->
    api.addRoutes "users", server

  it "should have post and get routes", ->
    assert.ok server.routes.post["/users/auth/:token/pictures"]
    assert.ok server.routes.get["/users/:username/size/:size"]

  it "should reply to a post avatar with ok", ->
    server.request "post", "/users/auth/:token/pictures",
      params: user:{ username: "test"}
    assert.equal server.res.body, "pong/pop"###

# vim: ts=2:sw=2:et:
