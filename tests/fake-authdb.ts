class AuthdbClient {
  store: {};
  constructor() {
    this.store = {};
  }
  addAccount(token: string | number, user: any) {
    return this.store[token] = user;
  }
  getAccount(token: string | number, cb: (arg0: string | null, arg1?: string) => any) {
    if (!this.store[token]) {
      return cb("invalid authentication token");
    }
    return cb(null, this.store[token]);
  }
}

export default
  { createClient() { return new AuthdbClient; } };
// vim: ts=2:sw=2:et:

