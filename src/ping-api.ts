
import { Request, Response, Server, Next } from 'restify';

const ping = function (req: Request, res: Response, next: Next) {
  res.send("pong/" + req.params.token);
  return next();
};

export const addRoutes = (prefix: string, server: Server) => {
  server.get(`/${prefix}/ping/:token`, ping);
  return server.head(`/${prefix}/ping/:token`, ping);
};


// vim: ts=2:sw=2:et:
