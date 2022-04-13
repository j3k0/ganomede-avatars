import assert from "assert";
import { Server } from "restify";
import { addRoutes as addPingRoutes } from "../src/ping-api";

import fakeRestify from "./fake-restify";
const server = fakeRestify.createServer();

describe("ping-api", function () {

  before(() => addPingRoutes("users", server as unknown as Server));

  it("should have get and head routes", function () {
    assert.ok(server.routes.get["/users/ping/:token"]);
    return assert.ok(server.routes.head["/users/ping/:token"]);
  });

  return it("should reply to a ping with a pong", function () {
    server.request("get", "/users/ping/:token", { params: { token: "pop" } });
    assert.equal(server.res.body, "pong/pop");
    server.request("head", "/users/ping/:token", { params: { token: "beep" } });
    return assert.equal(server.res.body, "pong/beep");
  });
});

// vim: ts=2:sw=2:et:
