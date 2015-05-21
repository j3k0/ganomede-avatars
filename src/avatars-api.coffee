log = require "./log"
authdb = require "authdb"
restify = require "restify"
config = require '../config'
DB = require "./couchdb"

sendError = (err, next) ->
  log.error err
  next err

class AvatarApi
  constructor: (options = {}) ->
    # configure authdb client
    @authdbClient = options.authdbClient || authdb.createClient(
      host: config.authdb.host
      port: config.authdb.port)
    DB.initialize config.couch, (err, ldb) =>
      @db = ldb

  addRoutes: (prefix, server) ->
    #
    # Middlewares
    #
    # Populates req.params.user with value returned from authDb.getAccount()
    authMiddleware = (req, res, next) =>
      authToken = req.params.authToken
      if !authToken
        err = new restify.InvalidContentError('invalid content')
        return sendError(err, next)

      @authdbClient.getAccount authToken, (err, account) ->
        if err || !account
          err = new restify.UnauthorizedError('not authorized')
          return sendError(err, next)

        req.params.user = account
        next()

    # POST /pictures
    postAvatar = (req, res, next) =>
      callback = (err, result) =>
        res.send result

      req.pipe (@db.insertAttach req.params.username,
        'original.png',
        null,
        'image/png',
        callback)
      next()

    getThumbnail = (req, res, next) =>
      username = req.params.username
      size = req.params.size
      res.setHeader 'content-type', 'image/png'
      res.setHeader 'Cache-Control', 'max-age=3600'
      @db.getAttach username, "original.png", res
      next()

    server.post "/#{prefix}/auth/:username/pictures",
      postAvatar

    server.get "/#{prefix}/:username/size/:size",
      getThumbnail

module.exports =
  create: (options = {}) -> new AvatarApi(options)

