import assert from "assert";
import expect from 'expect.js';
import avatarsApi from "../src/avatars-api";
import supertest from 'supertest';
import fakeAuthDb from './fake-authdb';
import Server from '../src/server';
const server = Server.createServer();
import { config } from '../config';
import vasync from 'vasync';
import fs from 'fs';
import { log } from '../src/log';

type BanClient = {
  _nCalls: number, _callArgs: string[],
  isBanned: (username: string, cb: (err: null, b: boolean) => void) => void
}

describe('Avatars API', function () {

  const go = supertest.bind(supertest, server);
  const authdbClient = fakeAuthDb.createClient();
  const bansClient: BanClient = {
    _nCalls: 0,
    _callArgs: [],
    isBanned(username: string, callback: (err: null, b: boolean) => void) {
      ++this._nCalls;
      this._callArgs.push(username);
      const banned = username.indexOf('banned-') === 0;
      return process.nextTick(() => callback(null, banned));
    }
  };

  const endpoint = (path?: string) => `/${config.routePrefix}${path || ''}`;

  const users = {
    'alice': { username: 'alice', token: 'alice-token' },
    'banned-joe': { username: 'banned-joe', token: 'banned-joe-token' }
  };

  const filename = "./tests/image-resizer/Yoshi.png";

  before(done => {
    //boundary = Math.random()
    //br = '\r\n'
    for (let username of Object.keys(users || {})) {
      const accountInfo = users[username];
      authdbClient.addAccount(accountInfo.token, accountInfo);
    }

    const api = avatarsApi.create({
      authdbClient,
      bansClient
    });

    api.addRoutes(config.routePrefix, server);
    return api.initialize(() => server.listen(() => {
      done();
    }));
  });

  after(done => {
    server.close(done);
  });

  describe('POST ' + endpoint('/auth/:token/pictures'), function () {
    it('handles image upload', function (done: () => any) {

      supertest(server)
        .post(endpoint('/auth/alice-token/pictures'))
        .attach('avatar', filename)
        .expect(200)
        .end(function (err: any, res: { body: { url: any; }; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.an(Object);
          expect(res.body.url).to.be(undefined);
          done();
        });
    });

    it('allows to replace the picture', function (done: () => any) {
      go()
        .post(endpoint('/auth/alice-token/pictures'))
        .attach('avatar', filename)
        .expect(200)
        .end(function (err: any, res: { body: { url: any; }; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.an(Object);
          expect(res.body.url).to.be(undefined);
          return done();
        });
    });
  });

  describe('GET ' + endpoint('/alice/original.png'), function () {
    let etag: string;

    it('retrieves the original image', function (done: () => any) {
      go()
        .get(endpoint('/alice/original.png'))
        .expect(200)
        .expect('Content-Type', 'image/png')
        .end(function (err: any, res: { body: { length: any; }; header: { etag: any; }; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.a(Buffer);
          expect(res.body.length).to.be(453723);
          expect(res.header.etag).not.to.be.empty();
          ({
            etag
          } = res.header);
          return done();
        });
    });

    it('caches the results', function (done: () => any) {
      go()
        .get(endpoint('/alice/original.png'))
        .set('if-none-match', etag)
        .expect(304)
        .end(function (err: any, res: { body: any; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.empty();
          return done();
        });
    });

    it('expects the right revision for caching', function (done: () => any) {
      go()
        .get(endpoint('/alice/original.png'))
        .set('if-none-match', 'wrong-etag')
        .expect(200)
        .end(function (err: any, res: { body: { length: any; }; header: { etag: any; }; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.a(Buffer);
          expect(res.body.length).to.be(453723);
          expect(res.header.etag).not.to.be.empty();
          return done();
        });
    });

    it('fails with 404', function (done: () => any) {
      go()
        .get(endpoint('/bob/original.png'))
        .set('if-none-match', etag)
        .expect(404)
        .end(function (err: any, res: { body: { code: any; }; }) {
          expect(err).to.be(null);
          expect(res.body.code).to.be('NotFound');
          return done();
        });
    });
  });

  describe('GET ' + endpoint('/alice/#{size}.png'), function () {
    it('retrieves 64x64 resized images', function (done: () => any) {
      go()
        .get(endpoint('/alice/64.png'))
        .expect(200)
        .expect('Content-Type', 'image/png')
        .end(function (err: any, res: { body: any; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.a(Buffer);
          return done();
        });
    });

    it('retrieve 128x128 resized images', function (done: () => any) {
      go()
        .get(endpoint('/alice/128.png'))
        .expect(200)
        .expect('Content-Type', 'image/png')
        .end(function (err: any, res: { body: any; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.a(Buffer);
          return done();
        });
    });

    it('retrieve 256x256 resized images', function (done: () => any) {
      go()
        .get(endpoint('/alice/256.png'))
        .expect(200)
        .expect('Content-Type', 'image/png')
        .end(function (err: any, res: { body: any; }) {
          expect(err).to.be(null);
          expect(res.body).to.be.a(Buffer);
          return done();
        });
    });

    it('calls bansClient to check for bans', function () {
      assert(bansClient._nCalls === 7);
      return assert.deepEqual(bansClient._callArgs, [
        'alice', 'alice', 'alice',
        'bob',
        'alice', 'alice', 'alice'
      ]);
    });

    it('fake bans client retursn false for alice', (done: () => any) => bansClient.isBanned('alice', function (err: any, banned: boolean) {
      assert(err === null);
      assert(banned === false);
      return done();
    }));

    it('fake bans client retursn true for banned-joe', (done: () => any) => bansClient.isBanned('banned-joe', function (err: any, banned: boolean) {
      assert(err === null);
      assert(banned === true);
      return done();
    }));

    it('banned users are 404', function (done: any) {
      go()
        .get(endpoint('/banned-joe/256.png'))
        .expect(404)
        .end(done);
    });
  });

  describe('POST ' + endpoint('/auth/:token/pictures/delete'), () => it('allows to delete the picture', function (done: () => any) {
    go()
      .post(endpoint('/auth/alice-token/pictures/delete'))
      .expect(200)
      .end(function (err: any, res: { body: { url: any; }; }) {
        expect(err).to.be(null);
        expect(res.body).to.be.an(Object);
        expect(res.body.url).to.be(undefined);
        return done();
      });
  }));
});

// vim: ts=2:sw=2:et:
