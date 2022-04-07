import assert from 'assert';
import Logger from 'bunyan';
import { HttpError } from 'restify-errors';
import bans from '../src/bans';
import { ClientRetryApi } from '../src/json-client-retry';

describe('bans', function () {
  describe('createClient()', function () {
    it('returns FakeClient if env vars are missing and prints warnings', function () {
      const log = {
        warnCallCount: 0,
        warn(obj: { addr: any; port: any; }, message: any) {
          this.warnCallCount++;
          assert(obj.addr === null);
          assert(obj.port === null);
          return assert(/^Env missing some vars/.test(message));
        }
      };

      const client = bans.createClient({}, log as any);
      assert(client instanceof bans.FakeBansClient);
      return assert(log.warnCallCount === 1);
    });

    return it('returns RealClient when env has props', function () {
      const env = {
        USERS_PORT_8080_TCP_ADDR: 'domain.tld',
        USERS_PORT_8080_TCP_PORT: 999
      };

      const client = bans.createClient(env);
      assert(client instanceof bans.RealBansClient);
      return assert(client.api.url.href === 'http://domain.tld:999/');
    });
  });

  describe('FakeClient', () => it('#isBanned() always returns false on next tick', function (done: () => any) {
    let sameTick = true;

    new bans.FakeBansClient().isBanned('someone', function (err: any, banned?: boolean) {
      assert(err === null);
      assert(banned === false);
      assert(sameTick === false);
      return done();
    });

    return sameTick = false;
  }));


  return describe('RealClient', function () {
    const reply = (banned: any) => ({
      "username": "alice",
      "exists": banned,
      "createdAt": banned != null ? banned : { 1476531925454: 0 }
    });

    const fakeApi = (banned: boolean): ClientRetryApi => ({
      url: {},
      post(log: Logger, options: any, body: any, callback: (e: HttpError | null, arg1: any, arg2: any, arg3: any) => any) {
      },
      get(log: Logger, url: any, cb: (e: HttpError | null, arg1: any, arg2: any, arg3: any) => any) {
        //get(log:Logger, url: any, cb: (arg0: any, arg1: {}, arg2: {}, arg3: { username: string; exists: any; createdAt: any; }) => any) {
        assert(url, '/users/v1/banned-users/alice');
        assert(cb instanceof Function);
        return process.nextTick(() => cb(null, {}, {}, reply(banned)));
      }
    });

    it('returns true for existing bans', (done) => {
      const client = new bans.RealBansClient('domain.tld', 999);
      client.api = fakeApi(true);

      return client.isBanned('alice', (err: any | null, banned?: boolean) => {
        assert(err === null);
        assert(banned === true);
        return done();
      });
    });

    return it('returns false for non-existing bans', (done) => {
      const client = new bans.RealBansClient('domain.tld', 999);
      client.api = fakeApi(false);

      return client.isBanned('alice', (err: any | null, banned?: boolean) => {
        assert(err === null);
        assert(banned === false);
        return done();
      });
    });
  });
});
