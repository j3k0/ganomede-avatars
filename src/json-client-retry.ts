import Logger from 'bunyan';
import { Request, Response } from 'restify';
import { JsonClient } from 'restify-clients';
import { HttpError } from 'restify-errors';

type DoneResult = { req: Request; res: Response; body: any; } | null;
type DoneCallback = (err: HttpError, result: DoneResult) => void;
type JsonRetryCallback = (e: HttpError | null, req: Request, res: Response, body: any) => void;
export type ClientRetryApi = {
    url: any, get: (log: Logger, options: any, cb: JsonRetryCallback) => void,
    post: (log: Logger, options: any, body: any, cb: JsonRetryCallback) => void
};

export const jsonClientRetry = (jsonClient: JsonClient): ClientRetryApi => {
    return {
        url: jsonClient.url,
        get(log: Logger, options: any, callback: (e: HttpError | null, arg1: any, arg2: any, arg3: any) => any) {
            requestAndRetry({
                log,
                requester: (cb: (e2: HttpError, arg1: DoneResult) => any) => jsonClient.get(options, (err: HttpError, req: Request, res: Response, body: any) => cb(err, { body, req, res })),
                done: (err: HttpError, result: DoneResult) => callback(err, result === null || result === void 0 ? void 0 : result.req, result === null || result === void 0 ? void 0 : result.res, result === null || result === void 0 ? void 0 : result.body)
            });
        },
        post(log: Logger, options: any, body: any, callback: (e: HttpError | null, arg1: any, arg2: any, arg3: any) => any) {
            // post should probably not be retried
            requestAndRetry({
                log,
                requester: (cb: (e2: HttpError, arg1: DoneResult) => any) => jsonClient.post(options, body, (err: HttpError, req: Request, res: Response, body: any) => cb(err, { body, req, res })),
                done: (err: HttpError, result: DoneResult) => callback(err, result === null || result === void 0 ? void 0 : result.req, result === null || result === void 0 ? void 0 : result.res, result === null || result === void 0 ? void 0 : result.body)
            });
        }
    };
}
function requestAndRetry(options: { log: Logger; requester: any; done: DoneCallback }, numTries = 1, maxTries = 3) {
    options.requester((err: HttpError, result: any) => {
        if (numTries < maxTries && (err === null || err === void 0 ? void 0 : err.code) === 'ECONNRESET') {
            options.log.error({ err_code: err.code, numTries }, "Retrying failed request");
            setTimeout(() => requestAndRetry(options, numTries + 1, maxTries), 300);
        }
        else {
            options.done(err, result);
        }
    });
}