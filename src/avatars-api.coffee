log = require "./log"
authdb = require "authdb"
restify = require "restify"
config = require '../config'
DB = require "./couchdb"
fs = require 'fs'
request = require "request"

sendError = (err, next) ->
  log.error err
  next err

class AvatarApi
  constructor: (options = {}) ->
    # configure authdb client
    @authdbClient = options.authdbClient
    if !@authdbClient
      log.info "create authdbClient"
      authdbClient = authdb.createClient(
        host: config.authdb.host
        port: config.authdb.port)

  initialize: (done) ->
    DB.initialize config.couch, (err, ldb) =>
      @db = ldb
      done? err

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

    couchBase = "#{config.couch.serverUri}/#{config.couch.name}"

    # POST /pictures
    postAvatar = (req, res, next) =>

      doc = req.params.user.username
      #log = req.log
      insertDone = (err, result) ->
        log.info "insertDone"
        if err
          log.error err
          return sendError err, next
        res.send
          ok:true
          url:"#{couchBase}/#{doc}/original.png"
        next()

      for i of req.files
        f = req.files[i]
        if f.type != "image/png"
          log.error "wrong file type: #{f.type}"
          err = new restify.InvalidContentError('invalid content')
          return sendError err, next
        file = fs.createReadStream(f.path)
        @db.createAttachmentStream doc, 'original.png', null, 'image/png',
          (attachement) ->
            log.info "createAttachmentStream done"
            file.pipe attachement
            file.on 'end', insertDone
        return

    getThumbnail = (req, res) =>
      username = req.params.username
      size = req.params.size
      if req.headers["if-none-match"] == "Y"
        log.info "/#{username}/#{size} using cache"
        res.setHeader('Cache-Control', 'max-age=3600')
        res.send 304
      else
        log.info "/#{username}/#{size} NOT using cache"
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'max-age=3600')
        res.setHeader('ETag', "Y")
        res.writeHead(200)
        request.get("#{couchBase}/#{username}/#{size}").pipe(res)

    server.post "/#{prefix}/auth/:authToken/pictures",
      authMiddleware, postAvatar

    server.get "/#{prefix}/:username/:size",
      getThumbnail

module.exports =
  create: (options = {}) -> new AvatarApi(options)

# vim: ts=2:sw=2:et:
