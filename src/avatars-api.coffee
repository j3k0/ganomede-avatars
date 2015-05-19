log = require "./log"
authdb = require "authdb"
restify = require "restify"
config = require '../config'

sendError = (err, next) ->
  log.error err
  next err
    
class AvatarApi
  constructor: (options = {}) ->
    # configure authdb client
    @authdbClient = options.authdbClient || authdb.createClient(
      host: config.authdb.host
      port: config.authdb.port)

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

    test = (req, res, next) ->
      res.send "test/" + req.params.token
      next()
        
    # POST /pictures
    postAvatar = (req, res, next) =>
      body = req.body
      res.send req.files[0]
      next()

    server.post "/#{prefix}/auth/:token/pictures",
      postAvatar

    server.get "/#{prefix}/auth/:token/test",
      test

module.exports =
  create: (options = {}) -> new AvatarApi(options)
            