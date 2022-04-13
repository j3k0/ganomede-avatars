// About

import os from "os";
import pk from "../package.json";
import { Request, Response, Server, Next } from 'restify';

const about = {
  hostname: os.hostname(),
  type: pk.name,
  version: pk.version,
  description: pk.description,
  startDate: (new Date).toISOString()
};

const sendAbout = function (req: Request, res: Response, next: Next) {
  res.send(about);
  return next();
};

export const addRoutes = (prefix: string, server: Server) => {
  server.get("/about", sendAbout);
  return server.get(`/${prefix}/about`, sendAbout);
};

// vim: ts=2:sw=2:et:
