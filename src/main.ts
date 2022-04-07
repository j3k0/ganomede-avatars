import { log } from "./log";
import { addRoutes as addAboutApi } from "./about-api";
import { Request, Response, Server, Next } from 'restify';
import { addRoutes as addPingApi } from "./ping-api";
import avatarsApi, { AvatarApi } from "./avatars-api";
import bans from "./bans";

export class Main {
  api: AvatarApi | null;

  constructor() {
    this.api = null;
  }

  initialize(callback?: any) {
    log.info("initializing backend");
    const bansClient = bans.createClient(process.env);
    this.api = avatarsApi.create({ bansClient });
    return this.api.initialize(callback);
  };

  addRoutes(prefix: string, server: Server) {
    log.info(`adding routes to ${prefix}`);

    // Platform Availability
    addPingApi(prefix, server);

    // About
    addAboutApi(prefix, server);

    // Avatar
    return this.api?.addRoutes(prefix, server);
  };

  destroy() {
    log.info("destroying backend");
    this.api = null;
  };
}

