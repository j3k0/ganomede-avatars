import restify from 'restify-clients';
import { log as logger } from './log';
import { ClientRetryApi, jsonClientRetry } from './json-client-retry';
import Logger from 'bunyan';
import { Request, Response } from 'restify';

export type BanInfo = {
  exists: boolean;
  username: string;
  createdAt: any;
};

export type BansClient = RealBansClient | FakeBansClient;

class RealBansClient {
  api: ClientRetryApi;
  log: Logger;
  constructor(addr: string, port: number, log?: Logger) {
    const url = `http://${addr}:${port}`;
    this.api = jsonClientRetry(restify.createJsonClient({ url }));
    this.log = log ? log : logger;
  }

  // true if @username is banned
  // false otherwise
  // callback(err, boolean)
  isBanned(username: string, callback: (err: Error | null, isBanned?: boolean) => void) {
    const url = `/users/v1/banned-users/${encodeURIComponent(username)}`;
    return this.api.get(this.log, url, (err: Error | null, req: Request, res: Response, banInfo: BanInfo) => {
      if (err) {
        this.log.error({ username, err }, 'Failed to check ban info');
        return callback(err);
      }

      return callback(null, !!banInfo.exists);
    });
  }
}

// When users service is not configured,
// consider every account to be in good standing (not banned).
class FakeBansClient {
  isBanned(username: string, callback: (err: Error | null, isBanned?: boolean) => void) {
    const fn = () => callback(null, false);
    return process.nextTick(fn);
  }
}

const createClient = function (env: any, logM: Logger = logger) {
  const addr = env.USERS_PORT_8080_TCP_ADDR || null;
  const port = env.USERS_PORT_8080_TCP_PORT || null;
  const exists = addr && port;

  if (exists) {
    return new RealBansClient(addr, port, logM);
  }

  logM.warn({ addr, port }, 'Env missing some vars, using fake client (no bans)');
  return new FakeBansClient();
};

export default { createClient, RealBansClient, FakeBansClient };
