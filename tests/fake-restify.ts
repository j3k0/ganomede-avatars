// vim: ts=2:sw=2:et:

class Res {
  status: number;
  body: any;
  constructor() {
    this.status = 200;
  }
  send(data: any) {
    return this.body = data;
  }
}

class Server {
  routes: { get: {}; head: {}; put: {}; post: {}; del: {}; };
  res: Res;
  constructor() {
    this.routes = {
      get: {},
      head: {},
      put: {},
      post: {},
      del: {}
    };
    this.res = new Res();
  }
  get(url: string | number, callback: any) {
    return this.routes.get[url] = callback;
  }
  head(url: string | number, callback: any) {
    return this.routes.head[url] = callback;
  }
  put(url: string | number, callback: any) {
    return this.routes.put[url] = callback;
  }
  post(url: string | number, callback: any) {
    return this.routes.post[url] = callback;
  }
  del(url: string | number, callback: any) {
    return this.routes.del[url] = callback;
  }

  request(type: string | number, url: string | number, req: any, callback?: (arg0: any) => any) {
    return this.routes[type][url](req, (this.res = new Res),
      (data: { status: number; }) => {
        if (data) {
          this.res.status = data.status || 500;
          this.res.send(data);
        }
        return (typeof callback === 'function' ? callback(this.res) : undefined);
      });
  }
}

export default
  { createServer() { return new Server; } };
