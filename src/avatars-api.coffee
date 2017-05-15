log = require "./log"
authdb = require "authdb"
restify = require "restify"
config = require '../config'
DB = require "./couchdb"
fs = require 'fs'
request = require "request"
ImageResizer = require './image-resizer'
vasync = require 'vasync'

sendError = (err, next) ->
  log.error err
  next err

class AvatarApi
  constructor: (options = {}) ->
    # configure authdb client
    @authdbClient = options.authdbClient
    if !@authdbClient
      log.info "create authdbClient"
      @authdbClient = authdb.createClient(
        host: config.authdb.host
        port: config.authdb.port)

    @bansClient = options.bansClient
    if (!@bansClient)
      throw new TypeError('Please provide options.bansClient')

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
          log.error "getAccount error",
            url: req.url
            headers: req.headers
            authToken: authToken
          msg = 'not authorized, authToken invalid: ' + authToken
          err = new restify.UnauthorizedError(msg)
          return sendError(err, next)

        req.params.user = account
        next()

    couchBase = "#{config.couch.serverUri}/#{config.couch.name}"

    resizer = new ImageResizer(ImageResizer.RESIZERS.LWIP)

    # POST /pictures
    postAvatar = (req, res, next) =>

      docId = req.params.user.username

      # Find the file to insert
      log.debug "find the file to insert"
      fArray = (f for i,f of req.files when f.type == "image/png")
      if fArray.length != 1
        log.error "wrong file type / can't find png"
        err = new restify.InvalidContentError('invalid content')
        return sendError err, next
      f = fArray[0]

      fileData = null
      vasync.waterfall [

        # Load the file
        readFile = (cb) ->
          log.info "loading the file (#{f.path})"
          fs.readFile f.path, (err, data) ->
            fileData = data
            cb err, data

        # Create resized versions
        resize = (fileData, cb) ->
          log.info "create resized versions"
          resizer.resize fileData, cb

        # insert multipart attachment
        insert = (sizes, cb) =>
          attachments = ({
            name: "#{size}.png"
            data: data
            content_type: "image/png"
          } for size,data of sizes)
          .concat
            name: "original.png"
            data: fileData
            content_type: "image/png"
          log.info "insert as multipart", attachments.map (a) ->
            name: a.name
            length: a.data.length
          @db.insertMultipart docId, config:config, attachments, cb
      ],
      (err) ->

        # Send result to user
        if err
          log.error "POST failed", err
          return sendError err, next
        log.info "POST successful"
        res.send
          ok:true
          url:"#{couchBase}/#{docId}/original.png"
        next()

    # callback(err, info)
    # info:
    #   - fresh Boolean (whether etag matches revision)
    #   - headers Object (headers to set on reply)
    fetchAvatarInfo = (username, size, etag, cb) =>
      @db.getRev username, (err, rev) ->
        if (err)
          if (err.statusCode == 404)
            return cb(null, null)

          log.error({username, size, err}, 'Failed to fetch avatar info')
          return cb(err)

        fresh = etag == rev
        headers = {'Cache-Control': 'max-age=3600'}
        status = 304

        if (!fresh)
          headers['Content-Type'] = 'image/png'
          headers['ETag'] = rev
          status = 200

        cb(null, {fresh, headers, status})

        # if rev
        #   if etag == rev
        #     log.info "/#{username}/#{size} 304"
        #     res.setHeader('Cache-Control', 'max-age=3600')
        #     res.send 304
        #   else
        #     log.info "/#{username}/#{size} 200"
        #     res.setHeader('Content-Type', 'image/png')
        #     res.setHeader('Cache-Control', 'max-age=3600')
        #     res.setHeader('ETag', rev)
        #     res.writeHead(200)
        # else
        #   cb(null, null)

    getThumbnail = (req, res, next) =>
      username = req.params.username
      size = req.params.size
      etag = req.headers["if-none-match"]

      onInfo = (err, results) ->
        if (err)
          log.error({err}, 'getThumbnail() failed')

          console.dir({status: err})

          return next(new restify.InternalServerError('hehe'))

        banned = results.operations[0].result
        avatarInfo = results.operations[1].result

        if (banned || !avatarInfo)
          err = new restify.NotFoundError('no avatar for user')
          reason = if banned then 'banned' else 'missing'
          log.info "/#{username}/#{size} 404 (#{reason})"
          return next(err)

        log.info("/#{username}/#{size}", avatarInfo.status)
        res.writeHead(avatarInfo.status, avatarInfo.headers)

        if avatarInfo.fresh
          res.end()
        else
          request.get("#{couchBase}/#{username}/#{size}").pipe(res)

        next()

      vasync.parallel({
        funcs: [
          (cb) => @bansClient.isBanned(username, cb),
          (cb) -> fetchAvatarInfo(username, size, etag, cb)
        ],
      }, onInfo)

    server.post "/#{prefix}/auth/:authToken/pictures",
      authMiddleware, postAvatar

    server.get "/#{prefix}/:username/:size",
      getThumbnail

module.exports =
  create: (options = {}) -> new AvatarApi(options)

# vim: ts=2:sw=2:et:
