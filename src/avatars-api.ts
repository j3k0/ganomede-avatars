import { log } from "./log";
import authdb from "authdb";
import restify from "restify";
import { Request, Response, Next as NextFunction } from 'restify';
import { InvalidContentError, UnauthorizedError, InternalServerError, NotFoundError } from "restify-errors"
import { config } from '../config';
import { DB } from "./couchdb";
import fs from 'fs';
import request from "request";
import { ImageResizer } from './image-resizer';
import vasync from 'vasync';
import { BansClient } from "./bans";

const sendError = function (err: any, next: NextFunction) {
  log.error(err);
  return next(err);
};

export class AvatarApi {
  authdbClient: any;
  bansClient?: BansClient;
  db: any;
  constructor(options: { authdbClient?: any; bansClient?: BansClient; }) {
    // configure authdb client
    if (options == null) { options = {}; }
    this.authdbClient = options.authdbClient;
    if (!this.authdbClient) {
      log.info("create authdbClient");
      this.authdbClient = authdb.createClient({
        host: config.authdb.host,
        port: config.authdb.port
      });
    }

    this.bansClient = options.bansClient;
    if (!this.bansClient) {
      throw new TypeError('Please provide options.bansClient');
    }
  }

  initialize(done: (arg0: any) => any) {
    return DB.initialize(config.couch, (err: any, ldb: any) => {
      this.db = ldb;
      return (typeof done === 'function' ? done(err) : undefined);
    });
  }

  addRoutes(prefix: string, server: restify.Server) {
    //
    // Middlewares
    //
    // Populates req.params.user with value returned from authDb.getAccount()
    const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const {
        authToken
      } = req.params;
      if (!authToken) {
        const err = new InvalidContentError('invalid content');
        return sendError(err, next);
      }
      return this.authdbClient.getAccount(authToken, function (err: any, account: any) {
        if (err || !account) {
          log.error("getAccount error", {
            url: req.url,
            headers: req.headers,
            authToken
          }
          );
          const msg = 'not authorized, authToken invalid: ' + authToken;
          err = new UnauthorizedError(msg);
          return sendError(err, next);
        }

        req.params.user = account;
        return next();
      });
    };

    const couchBase = `${config.couch.serverUri}/${config.couch.name}`;

    const resizer = new ImageResizer(ImageResizer.RESIZERS.LWIP);

    // POST /pictures
    const postAvatar = (req: Request, res: Response, next: NextFunction) => {

      let insert: (sizes: any, cb: any) => any, readFile: (cb: any) => any, resize: (fileData: any, cb: any) => any;
      let f: any;
      const docId = req.params.user.username;
      // Find the file to insert
      log.debug("find the file to insert");
      const fArray = ((() => {
        const result: any[] = [];
        for (let i in req.files) {
          f = req.files[i];
          if (f.type === "image/png") {
            result.push(f);
          }
        }
        return result;
      })());
      if (fArray.length !== 1) {
        log.error("wrong file type / can't find png");
        const err = new InvalidContentError('invalid content');
        return sendError(err, next);
      }
      f = fArray[0];

      let fileData = null;
      return vasync.waterfall([

        // Load the file
        (readFile = function (cb: (arg0: any, arg1: any) => any) {
          log.info(`loading the file (${f.path})`);
          return fs.readFile(f.path, function (err: any, data: any) {
            fileData = data;
            return cb(err, data);
          });
        }),

        // Create resized versions
        (resize = function (fileData: any, cb: any) {
          log.info("create resized versions");
          return resizer.resize(fileData, cb);
        }),

        // insert multipart attachment
        (insert = (sizes: { [x: string]: any; }, cb: any) => {
          const attachments = ((() => {
            const result1: any[] = [];
            for (let size in sizes) {
              const data = sizes[size];
              result1.push({
                name: `${size}.png`,
                data,
                content_type: "image/png"
              });
            }
            return result1;
          })())
            .concat({
              name: "original.png",
              data: fileData,
              content_type: "image/png"
            });
          log.info("insert as multipart", attachments.map((a: { name: any; data: { length: any; }; }) => ({
            name: a.name,
            length: a.data.length
          }))
          );
          return this.db.insertMultipart(docId, { config }, attachments, cb);
        })
      ],
        function (err: any) {

          // Send result to user
          if (err) {
            log.error("POST failed", err);
            return sendError(err, next);
          }
          log.info("POST successful");
          res.send({ ok: true });
          return next();
        });
    };

    // callback(err, info)
    // info:
    //   - fresh Boolean (whether etag matches revision)
    //   - headers Object (headers to set on reply)
    const fetchAvatarInfo = (username: any, size: any, etag: any, cb: (arg0: any, arg1?: null | { fresh: boolean; headers: { 'Cache-Control': string; }; }) => any) => {
      return this.db.getRev(username, function (err: { statusCode: number; }, rev: any) {
        if (err) {
          if (err.statusCode === 404) {
            return cb(null, null);
          }

          log.error({ username, size, err }, 'Failed to fetch avatar info');
          return cb(err);
        }

        const fresh = etag === rev;
        const headers = { 'Cache-Control': 'max-age=3600' };

        if (!fresh) {
          headers['Content-Type'] = 'image/png';
          headers['ETag'] = rev;
        }

        return cb(null, { fresh, headers });
      });
    };

    // if rev
    //   if etag == rev
    //     log.info "/#{username}/#{size} 304"
    //     res.setHeader('Cache-Control', 'max-age=3600')
    //     res.send 304
    //   else
    //     log.info "/#{username}/#{size} 200"
    //     res.setHeader('Content-Type', 'image/png')
    //     res.setHeader('Cache-Control', 'max-age=3600')
    //     res.setHeader('ETag', rev)
    //     res.writeHead(200)
    // else
    //   cb(null, null)

    const getThumbnail = (req: Request, res: Response, next: NextFunction) => {
      const {
        username
      } = req.params;
      const {
        size
      } = req.params;
      const etag = req.headers["if-none-match"];

      const onInfo = function (err: Error, results: { operations: {}; }) {
        if (err) {
          log.error({ err }, 'getThumbnail() failed');

          console.dir({ status: err });

          return next(new InternalServerError('' + err));
        }

        const banned = results.operations[0].result;
        const avatarInfo = results.operations[1].result;

        if (banned || !avatarInfo) {
          err = new NotFoundError('no avatar for user');
          const reason = banned ? 'banned' : 'missing';
          log.info(`/${username}/${size} 404 (${reason})`);
          return next(err);
        }

        log.info(`/${username}/${size}`, avatarInfo.fresh ? 304 : 200);

        if (avatarInfo.fresh) {
          res.send(304);
        } else {
          res.writeHead(200, avatarInfo.headers);
          request.get(`${couchBase}/${username}/${size}`).pipe(res);
        }

        return next();
      };

      return vasync.parallel({
        funcs: [
          (cb: any) => this.bansClient?.isBanned(username, cb),
          (cb: any) => fetchAvatarInfo(username, size, etag, cb)
        ],
      }, onInfo);
    };

    const deleteAvatar = (req: Request, res: Response, next: NextFunction) => {
      const {
        username
      } = req.params.user;
      return this.db.delete(username, function (err: string, rev: any) {
        if (err) {
          log.error({ err }, 'deleteAvatar() failed');
          console.dir({ status: err });
          return next(new InternalServerError('' + err));
        }
        return res.send(200);
      });
    };


    server.post(`/${prefix}/auth/:authToken/pictures`,
      authMiddleware, postAvatar);

    server.get(`/${prefix}/:username/:size`,
      getThumbnail);

    server.post(`/${prefix}/auth/:authToken/pictures/delete`,
      authMiddleware, deleteAvatar);

    return server.del(`/${prefix}/auth/:authToken/pictures`,
      authMiddleware, deleteAvatar);
  }
}

export default
  { create(options: {}) { if (options == null) { options = {}; } return new AvatarApi(options); } };

// vim: ts=2:sw=2:et:
