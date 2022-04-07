import { log as logMod } from './log';
import { StatsD } from 'node-statsd';
import Logger from 'bunyan';

const dummyClient = () => ({
  increment() { },
  timing() { },
  decrement() { },
  histogram() { },
  gauge() { },
  set() { },
  unique() { }
});

const requiredEnv = ['STATSD_HOST', 'STATSD_PORT', 'STATSD_PREFIX'];

const missingEnv = function () {
  for (let e of Array.from(requiredEnv)) {
    if (!process.env[e]) {
      return e;
    }
  }
  return undefined;
};

export const createClient = function (logArg?: Logger) {
  const log = logArg || logMod.child({
    module: 'statsd'
  });
  if (missingEnv()) {
    log.warn("Can't initialize statsd, missing env: " + missingEnv());
    return dummyClient();
  }
  const client = new StatsD({
    host: process.env.STATSD_HOST as string,
    port: +process.env.STATSD_PORT!,
    prefix: process.env.STATSD_PREFIX
  });
  client.socket.on('error', (error: any) => log.error("error in socket", error));
  return client;
};

export default {
  createClient,
  dummyClient
};
