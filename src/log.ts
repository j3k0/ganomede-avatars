import bunyan from "bunyan";
const log = bunyan.createLogger({ name: "avatars" });

// class used by elasticsearch for logging
log['ElasticLogger'] = class {
  log: bunyan;
  error: any;
  warning: any;
  public info: any;
  debug: any;
  trace: (method: any, requestUrl: any, body: any, responseBody: any, responseStatus: any) => any;
  close: () => any;
  constructor(config: any) {
    this.log = log;
    this.error = log.error.bind(log);
    this.warning = log.warn.bind(log);
    this.info = log.info.bind(log);
    this.debug = log.debug.bind(log);
    this.trace = (method: any, requestUrl: any, body: any, responseBody: any, responseStatus: any) => log.trace({
      method,
      requestUrl,
      body,
      responseBody,
      responseStatus
    });
    // bunyan's loggers do not need to be closed
    this.close = () => undefined;
  }
};

export { log };
// vim: ts=2:sw=2:et:
