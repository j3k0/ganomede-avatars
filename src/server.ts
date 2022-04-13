

import { Request, Response, Server, Next } from 'restify';
import restify from 'restify';
import { log as logger } from './log';
import { config } from '../config';
import sendAudit from './send-audit-stats';

export interface RequestWithGanomede extends Request {
  ganomede: { secretMatches: boolean; userId?: string; }
}

const matchSecret = (obj: Request, prop: string) => {
  const has = obj && obj[prop] && Object.hasOwnProperty.call(obj[prop], 'secret');
  const match = has && (typeof obj[prop].secret === 'string')
    && (obj[prop].secret.length > 0) && (obj[prop].secret === config.secret);

  if (has)
    delete obj[prop].secret;

  return match;
};

const shouldLogRequest = (req: Request) =>
  req.url?.indexOf(`${config.http.prefix}/ping/_health_check`) !== 0;

const shouldLogResponse = (res: Response) =>
  (res && res.statusCode >= 500);

const filteredLogger = (errorsOnly: boolean, logger: { (req: any): any; (arg0: any, arg1: any): void; }) => (req: any, res: any, next: () => void) => {
  const logError = errorsOnly && shouldLogResponse(res);
  const logInfo = !errorsOnly && (
    shouldLogRequest(req) || shouldLogResponse(res));
  if (logError || logInfo)
    logger(req, res);
  if (next && typeof next === 'function')
    next();
};

export default {
  createServer: () => {

    logger.info({ env: process.env }, 'environment');

    const server = restify.createServer({
      handleUncaughtExceptions: true,
      log: logger
    });

    const requestLogger = filteredLogger(false, (req: Request) =>
      req.log.info({ req_id: req.id() }, `${req.method} ${req.url}`));
    server.use(requestLogger);

    server.use(restify.plugins.queryParser());
    server.use(restify.plugins.bodyParser());

    // Audit requests
    server.on('after', filteredLogger(process.env.NODE_ENV === 'production',
      restify.plugins.auditLogger({ log: logger, event: 'after', body: true })));

    // Automatically add a request-id to the response
    function setRequestId(req: Request, res: Response, next: Next) {
      req.log = req.log.child({ req_id: req.id() });
      res.setHeader('X-Request-Id', req.id());
      return next();
    }
    server.use(setRequestId);

    // Send audit statistics
    server.on('after', sendAudit.sendAuditStats);

    // Init object to dump our stuff into.
    server.use((req: Request, res: Response, next: Next) => {
      (req as RequestWithGanomede).ganomede = {
        secretMatches: matchSecret(req, 'body') || matchSecret(req, 'query')
      };

      next();
    });

    return server;
  }
};
