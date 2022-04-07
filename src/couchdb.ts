import nano, { DocumentScope } from 'nano';
import vasync from 'vasync';
import { log } from './log';

const DEFAULT_LIMIT = 25;

const timestamp = function (n: { getTime: () => any; }) {
  if (n instanceof Date) { return n.getTime(); } else { return n; }
};


export class DB {
  static views: {};
  log: any;
  db: any;
  designName: string;
  static initClass() {

    this.views = {};
  }
  constructor(dbname: string, serverUri: any, designName: string) {
    this.log = log.child({ DB: dbname });
    this.db = nano(serverUri).use(dbname);
    this.designName = designName;
  }

  // Gets doc by its id.
  get(id: string, callback: (arg0: any, arg1?: null) => any) {
    return this.db.get(id, function (err: { error: string; reason: string; }, doc: any, headers: any) {
      if (err && !((err.error === 'not_found') && (err.reason === 'missing'))) {
        log.error('Failed to retrieve Couch doc', {
          err,
          _id: id,
          headers
        });
        return callback(err);
      }

      if (err || !doc) {
        return callback(null, null);
      }

      return callback(null, doc);
    });
  }

  getRev(id: any, callback: (arg0: any, arg1?: any) => any) {
    return this.db.head(id, function (err: { error: string; reason: string; }, body: any, headers: { etag: { replace: (arg0: {}, arg1: string) => any; }; }) {
      if (err && !((err.error === 'not_found') && (err.reason === 'missing'))) {
        //log.error 'Failed to retrieve Couch doc',
        //  err: err,
        //  _id: id,
        //  headers: headers
        return callback(err);
      } else {
        // http://docs.couchdb.org/en/latest/api/document/common.html
        // The ETag header shows the current revision for the
        // requested document.
        if (headers != null ? headers.etag : undefined) {
          return callback(null, headers.etag.replace(/"/g, ''));
        } else {
          return callback(null);
        }
      }
    });
  }

  // Delete doc by its id.
  delete(id: any, callback: (arg0: any, arg1: any) => any) {
    return vasync.waterfall([
      (cb) => this.getRev(id, cb),
      (body: { rev: any; }, cb: (arg0: any, arg1?: undefined) => any) => {
        return this.db.destroy(id, body != null ? body : undefined, function (err: any, doc: any, headers: any) {
          if (err) {
            log.error('Failed to delete Couch doc', {
              err,
              _id: id,
              headers
            }
            );
            return cb(err);
          }
          return cb(null, body != null ? body.rev : undefined);
        });
      }
    ], function (err: any, result: any) {
      log.info("done");
      if (err) {
        log.error(err);
      }
      return callback(err, result);
    });
  }

  // Saves doc to couch
  insert(doc: any, customId: any, callback: (arg0: any, arg1?: any) => any) {
    const cb = (err: any, result: any, headers: any) => {
      if (err) {
        this.log.error('Failed to save doc to Couch', {
          err,
          doc,
          customId,
          result,
          headers
        }
        );
        return callback(err);
      }

      return callback(null, result);
    };

    const args = customId ? [doc, customId, cb] : [doc, cb];
    return this.db.insert.apply(this.db, args);
  }

  // Saves doc to couch
  createAttachmentStream(doc: any, imageName: any, data: any, mimeType: any, callback: (arg0: any) => any) {
    return this.db.head(doc, (err: any, body: any, headers: { etag: { replace: (arg0: {}, arg1: string) => any; }; }) => {
      if (headers.etag) {
        return callback(this.db.attachment.insert(doc, imageName, data, mimeType,
          { rev: headers.etag.replace(/"/g, '') }));
      } else {
        return callback(this.db.attachment.insert(doc, imageName, data, mimeType));
      }
    });
  }

  // Saves doc with many attachments to couch
  insertMultipart(id: any, doc: any, attachments: { map: (arg0: (attachment: any) => (body: any, cb: any) => any) => any; }, callback: (arg0: any, arg1: any) => any) {
    //@db.get id, { revs_info: true }, (err, body) =>
    //  if body
    //    doc.rev = body._rev
    //    @db.multipart.insert doc, attachments, id, callback
    //  else
    //    @db.multipart.insert doc, attachments, id, callback

    // Above code should work... but doesn't, so below is a
    // workaround...
    const {
      db
    } = this;
    return vasync.waterfall([
      function (cb: (arg0: any, arg1: { rev: any; }) => any) {
        log.info("get initial rev");
        return db.head(id, (err: any, body: any, headers: { etag: any; }) => cb(null, { rev: __guard__(headers != null ? headers.etag : undefined, (x: { replace: (arg0: {}, arg1: string) => any; }) => x.replace(/"/g, '')) }));
      },
      (initialBody: any, cb: any) => vasync.waterfall((attachments.map((attachment: { name: any; data: any; content_type: any; }) => (function (body: { rev: any; }, cb: (arg0: any, arg1: any) => any) {
        if (typeof body === 'function') {
          cb = body;
          body = initialBody;
        }
        const rev = body != null ? body.rev : undefined;
        log.info("insert", {
          attachment: attachment.name,
          rev
        }
        );
        if (rev) {
          return db.attachment.insert(id, attachment.name, attachment.data,
            attachment.content_type, { rev }, (err: any, result: any) => cb(err, result));
        } else {
          return db.attachment.insert(id, attachment.name, attachment.data,
            attachment.content_type, {}, (err: any, result: any) => cb(err, result));
        }
      }))), cb)
    ]
      , function (err: any, result: any) {
        log.info("done");
        if (err) {
          log.error(err);
        }
        return callback(err, result);
      });
  }

  // Saves doc with many attachments to couch
  insertAttachment(id: any, doc: any, attachment: { name: any; data: any; content_type: any; }, callback: any) {
    return this.db.head(id, (err: any, body: any, headers: { etag: { replace: (arg0: {}, arg1: string) => any; }; }) => {
      if (headers.etag) {
        return this.db.attachment.insert(id, attachment.name, attachment.data,
          attachment.content_type, { rev: headers.etag.replace(/"/g, '') }, callback);
      } else {
        return this.db.attachment.insert(id, attachment.name, attachment.data,
          attachment.content_type, callback);
      }
    });
  }

  // Lists challenges where `challenge.type == @type`.
  // (views.challenges)
  //
  // Options:
  //   before: will only include challeneges where
  //           `challenge.start < options.before`
  //   limit: will include at most limit challenges.
  //
  // callback(err, objects.ChallengesList)
  view(design: any, view: any, options: { [x: string]: any; before?: any; }, callback: (arg0: any, arg1?: any) => any) {
    if (arguments.length === 1) {
      callback = options as any;
      options = {};
    }

    const before = timestamp(options.before);
    const qs: { limit?: number } = {};
    for (let k of Object.keys(options || {})) {
      const v = options[k];
      qs[k] = v;
    }
    if (qs.limit === undefined) {
      qs.limit = DEFAULT_LIMIT;
    }

    return this.db.view(design, view, qs, function (err: { error: string; }, result: { rows: { map: (arg0: (row: any) => any) => any; }; }, headers: any) {
      if (err) {
        // Query parse errors have lower severity level,
        // so we use WARN for them.
        const method = err.error === 'query_parse_error' ? 'warn' : 'error';
        log[method](`Failed to query _${design}/${view}`, {
          err,
          qs,
          headers
        }
        );

        return callback(err);
      }

      const values = result.rows.map((row: { value: any; }) => row.value);
      return callback(null, values);
    });
  }

  // Lists all the entries where `entry.challengeId = challengeId`
  // (views.leaderboards)
  //
  // callback(err, objects.EntriesList)
  //leaderboard: (challengeId, options, callback) ->
  //  if arguments.length == 2
  //    callback = options
  //    options = {}
  //
  //  qs =
  //    startkey: [challengeId]
  //    endkey: [challengeId, {}]
  //
  //  if options.hasOwnProperty('limit')
  //    qs.limit = options.limit
  //
  //  @db.view designName, 'leaderboards', qs, (err, result, headers) ->
  //    if (err)
  //      log.error "Failed to query _#{designName}/leaderboards",
  //        err: err
  //        qs: qs
  //        headers: headers
  //      return callback(err)
  //
  //    values = result.rows.map (row) -> row.value
  //    callback(null, new objects.EntriesList(challengeId, values))

  // Lists user's entries where `entry.username == username`.
  // (views.user_entries)
  //
  // Options:
  //   before: will only include entries where
  //           `entry.start < options.before`
  //   limit: will include at most limit entries.
  //
  // callback(err, [objects.Entry])
  //user_entries: (username, options, callback) ->
  //  if arguments.length == 2
  //    callback = options
  //    options = {}
  //
  //  before = timestamp(options.before)
  //  qs =
  //    startkey: [username]
  //    endkey: [username, {}]
  //    limit: options.limit || DEFAULT_LIMIT
  //
  //  before = timestamp(options.before)
  //  if (before)
  //    qs.startkey.push(1 - before)
  //
  //  @db.view designName, 'user_entries', qs, (err, result, headers) ->
  //    if err
  //      log.error "Failed to query _#{designName}/user_entries",
  //        err: err
  //        qs: qs
  //        headers: headers
  //      return callback(err)
  //
  //    entries = result.rows.map (row) -> new objects.Entry(row.value)
  //    callback(null, entries)

  // callback(err, db_exists, design_doc)
  static _init_get_info(db: { get: (arg0: string, arg1: (err: any, doc: any, headers: any) => any) => any; }, designName: any, callback: (arg0: any, arg1?: boolean, arg2?: null) => any) {
    return db.get(`_design/${designName}`, function (err: { error: string; reason: string; }, doc: any, headers: any) {
      if (err && (err.error !== 'not_found')) {
        log.error('Failed to query design doc', {
          err,
          headers
        }
        );
        return callback(err);
      }

      // 404
      if (err) {
        log.error(err, `_design/${designName}`);
        if (err.reason === 'no_db_file') {
          return callback(null, false, null);
        } else if (err.reason === 'missing') {
          return callback(null, true, null);
        } else {
          return callback(err);
        }
      }

      log.info("design exists");
      return callback(null, true, doc);
    });
  }

  // callback(err, insertResult, insertHeaders)
  static _init_save_views_if_different(db: { insert: (arg0: { views: any; _rev: any; }, arg1: string, arg2: any) => any; }, designName: any, design: { views: any; _rev: any; }, callback: { bind: (arg0: any, arg1: any) => any; }) {
    const dbViews = design.views;
    const changed = {};

    for (let name of Object.keys(this.views || {})) {
      const mapReduce = this.views[name];
      if (__guard__(dbViews != null ? dbViews[name] : undefined, (x: { map: any; }) => x.map) !== mapReduce.map) {
        changed[name] = mapReduce;
      }
    }

    // Everything's in place
    if (Object.keys(changed).length === 0) {
      log.info("all views are in place");
      return process.nextTick(callback.bind(null, null));
    }

    // Some stuff is different
    log.info(`Design doc in database \`_design/${designName}\` is different from \
design doc in app, recreating…`, {
      db_views: { views: design.views },
      app_views: { views: this.views },
      diff: changed
    }
    );

    const doc = { views: this.views, _rev: design._rev };
    return db.insert(doc, `_design/${designName}`, callback);
  }

  // This will create Couch database @dbname at @serverUri
  // and create design doc _design/designName with {views: views}.
  //
  // In case design doc exists, it will replace it with {views: views}
  // in case any views are different from the ones in this file.
  //
  // callback(err, DB instance)
  static initialize(options: { name?: any; serverUri?: any; designName?: any; }, callback: (arg0: any, arg1?: DB) => any) {

    const dbname = options.name;
    const {
      serverUri
    } = options;
    const {
      designName
    } = options;

    log.info("Initializing database", options);
    if (!serverUri || !dbname) {
      throw new Error('serverUri and dbname are required');
    }

    const couch = nano(serverUri);
    const db = couch.use(dbname);

    return vasync.waterfall([
      (cb: any) => DB._init_get_info(db, designName, cb),
      (db_exists: any, design: any, cb: any) => {
        if (!design) {
          if (!db_exists) {
            log.info(`Database \`${dbname}\` is missing, recreating…`);
          }
          log.info(`Design doc \`_design/${designName}\` is missing, recreating…`);

          const doc = { views: this.views };
          const createFn = couch.db.create.bind(couch.db, dbname);
          const insertFn = db.insert.bind(db, doc as any, `_design/${designName}`, cb);
          if (db_exists) { return insertFn(); } else { return createFn(insertFn as any); }
        }

        log.info("Check for missing");
        return DB._init_save_views_if_different(db, designName, design, cb);
      }

    ], function (err: any, results: any) {
      if (err) {
        log.error("Failed to initialize DB", {
          err,
          dbname,
          serverUri
        }
        );
        return callback(err);
      }

      log.info("create DB");
      return callback(null, new DB(dbname, serverUri, designName));
    });
  }
}
DB.initClass();
// vim: ts=2:sw=2:et:

function __guard__(value: any, transform: { (x: any): any; (x: any): any; (x: any): any; (arg0: any): any; }) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}