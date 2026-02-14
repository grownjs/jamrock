import { MemoryStore } from './store.ts';

export async function createStore(hash: any, options: any): Promise<any> {
  const secret = options.secret || '__UNSAFE__';
  const shared = options.store || new MemoryStore(options);

  function encode(value: any = Date.now()) {
    return hash.encode(value, secret);
  }

  function verify(input: any, value: any) {
    return hash.compare(input, value);
  }

  function key(sid: string) {
    return sid || encode();
  }

  function read(sid: string) {
    return shared.get(sid, {});
  }

  function write(sid: string, data: any, expire: number = 300) {
    return shared.set(sid, data, expire);
  }

  return {
    shared,
    encode,
    verify,
    write,
    read,
    key,
  };
}

export function createSessionSync(store: any, sid: string): any {
  return {
    verifyToken: store.verify,
    nextToken: store.encode,
    state: store.read(sid),
    sid: store.key(sid),
  };
}

export async function createSession(store: any, sid: string): Promise<any> {
  return {
    verifyToken: store.verify,
    nextToken: store.encode,
    state: await store.read(sid),
    sid: await store.key(sid),
  };
}
