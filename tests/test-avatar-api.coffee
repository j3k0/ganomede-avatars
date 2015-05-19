assert = require "assert"
avatarsApi = require "../src/avatars-api"

fakeRestify = require "./fake-restify"
server = fakeRestify.createServer()
api = avatarsApi.create()

describe "avatar-api", ->

  before ->
    api.addRoutes "users", server

  it "should have post and get routes", ->
    assert.ok server.routes.post["/users/auth/:token/pictures"]
    assert.ok server.routes.get["/users/auth/:token/test"]

  ###it "should reply to a ping with a pong", ->
    server.request "get", "/users/auth/:token/pictures", params: token: "pop"
    assert.equal server.res.body, "pong/pop"###

# vim: ts=2:sw=2:et:
