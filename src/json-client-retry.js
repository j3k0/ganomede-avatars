"use strict";

function jsonClientRetry(jsonClient) {
    return {
        get(log, options, callback) {
            requestAndRetry({
                log,
                requester: (cb) => jsonClient.get(options, (err, req, res, body) => cb(err, { body, req, res })),
                done: (err, result) => callback(err, result === null || result === void 0 ? void 0 : result.req, result === null || result === void 0 ? void 0 : result.res, result === null || result === void 0 ? void 0 : result.body)
            });
        },
        post(log, options, body, callback) {
            // post should probably not be retried
            requestAndRetry({
                log,
                requester: (cb) => jsonClient.post(options, body, (err, req, res, body) => cb(err, { body, req, res })),
                done: (err, result) => callback(err, result === null || result === void 0 ? void 0 : result.req, result === null || result === void 0 ? void 0 : result.res, result === null || result === void 0 ? void 0 : result.body)
            });
        }
    };
}
function requestAndRetry(options, numTries = 1, maxTries = 3) {
    options.requester((err, result) => {
        if (numTries < maxTries && (err === null || err === void 0 ? void 0 : err.code) === 'ECONNRESET') {
            options.log.error({ err_code: err.code, numTries }, "Retrying failed request");
            setTimeout(() => requestAndRetry(options, numTries + 1, maxTries), 300);
        }
        else {
            options.done(err, result);
        }
    });
}

module.exports = {
    jsonClientRetry: jsonClientRetry
};