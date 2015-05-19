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

  test: ->
    console.log('tetet')

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
      body = req.body
      avatar = body?.image
      file = req.files[0]
      console.log('XXXX: BODY', req.body)
      console.log('XXXX params', req.params)
      console.log('XXXX UPLOADED FILES', req.files)
      next()

    server.post "#{prefix}/auth/:authToken/pictures",
      authMiddleware, postAvatar

module.exports =
  create: (options = {}) -> new AvatarApi(options)

