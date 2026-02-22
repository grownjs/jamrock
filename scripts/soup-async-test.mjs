#!/usr/bin/env -S gjs -m

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

const loop = GLib.MainLoop.new(null, false);
const PORT = 19001;

const testNumStr = ARGV[0] || '1';
const TEST_NUM = parseInt(testNumStr);

function handler1(_server, msg, _path, _query) {
  msg.pause();
  Promise.resolve('ok').then(() => {
    msg.set_status(200, null);
    msg.get_response_body().append('PASS-1');
    msg.unpause();
  });
}

function handler2(_server, msg, _path, _query) {
  msg.pause();
  new Promise(resolve =>
    GLib.idle_add(GLib.PRIORITY_DEFAULT, () => { resolve(); return GLib.SOURCE_REMOVE; })
  ).then(() => {
    msg.set_status(200, null);
    msg.get_response_body().append('PASS-2');
    msg.unpause();
  });
}

function handler3(_server, msg, _path, _query) {
  msg.pause();
  new Promise(resolve => setTimeout(resolve, 0)).then(() => {
    msg.set_status(200, null);
    msg.get_response_body().append('PASS-3');
    msg.unpause();
  });
}

function handler4(_server, msg, _path, _query) {
  msg.pause();
  (async () => {
    await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
      resolve();
      return GLib.SOURCE_REMOVE;
    }));
    msg.set_status(200, null);
    msg.get_response_body().append('PASS-4');
    msg.unpause();
  })();
}

function handler5(_server, msg, _path, _query) {
  msg.pause();
  function runSync(asyncFn) {
    let done = false;
    let result;
    asyncFn().then(r => { result = r; done = true; });
    const ctx = GLib.MainContext.default();
    while (!done) ctx.iteration(true);
    return result;
  }
  const body = runSync(async () => {
    await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
      resolve();
      return GLib.SOURCE_REMOVE;
    }));
    return 'PASS-5';
  });
  msg.set_status(200, null);
  msg.get_response_body().append(body);
  msg.unpause();
}

// Test 6: multi-level async function chain (3 awaits deep, simulates handler.call depth)
async function _chain3() {
  await new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT, () => { resolve(); return GLib.SOURCE_REMOVE; }));
  return 'c3';
}
async function _chain2() {
  const r = await _chain3();
  await new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT, () => { resolve(); return GLib.SOURCE_REMOVE; }));
  return r + '+c2';
}
async function _chain1() {
  const r = await _chain2();
  return r + '+c1';
}
function handler6(_server, msg, _path, _query) {
  msg.pause();
  _chain1()
    .then(() => {
      msg.set_status(200, null);
      msg.get_response_body().append('PASS-6');
      msg.unpause();
    })
    .catch(err => {
      msg.set_status(500, null);
      msg.get_response_body().append(`FAIL-6: ${err}`);
      msg.unpause();
    });
}

// Test 7: mirrors the exact createSoupServer callback pattern from lib/gtk4/server.js
// callback(req).then(resp => serverResponse(...)).catch(...)
// where callback chains: createSession (2 awaits) → createResponse (1 await)
function handler7(_server, msg, _path, _query) {
  msg.pause();

  async function fakeCreateSession() {
    // mirrors: await store.read(sid), await store.key(sid)
    const state = await Promise.resolve({});
    const sid = await Promise.resolve('test-sid');
    return { sid, state };
  }

  async function fakeCreateResponse(session) {
    // mirrors: await createBody(...)
    await new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT, () => { resolve(); return GLib.SOURCE_REMOVE; }));
    return { body: `PASS-7 sid=${session.sid}`, status: 200, headers: {} };
  }

  // mirrors handler.call in createHandler
  async function fakeHandlerCall() {
    const session = await fakeCreateSession();
    const conn = { session };
    const resp = await fakeCreateResponse(conn.session);
    return resp;
  }

  // mirrors the createSoupServer handler callback chain
  fakeHandlerCall()
    .then(resp => {
      msg.set_status(resp.status, null);
      msg.get_response_body().append(resp.body.split(' ')[0]); // just 'PASS-7'
      msg.unpause();
    })
    .catch(err => {
      msg.set_status(500, null);
      msg.get_response_body().append(`FAIL-7: ${err}`);
      msg.unpause();
    });
}

const handlers = { 1: handler1, 2: handler2, 3: handler3, 4: handler4, 5: handler5, 6: handler6, 7: handler7 };

print(`Test ${TEST_NUM}`);

const server = new Soup.Server();
server.add_handler('/', handlers[TEST_NUM]);
server.listen_all(PORT, Soup.ServerListenOptions.IPV4_ONLY);

let resolved = false;

GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
  const session = new Soup.Session();
  const req = Soup.Message.new('GET', `http://127.0.0.1:${PORT}/`);
  session.send_async(req, GLib.PRIORITY_DEFAULT, null, (_s, res) => {
    try {
      const stream = session.send_finish(res);
      const bytes = stream.read_bytes(1024, null);
      const body = new TextDecoder().decode(bytes.get_data());
      resolved = true;
      print(`${body === `PASS-${TEST_NUM}` ? 'PASS' : 'FAIL (' + body + ')'}`);
    } catch (e) {
      resolved = true;
      print(`FAIL (exception: ${e})`);
    }
    server.disconnect();
    loop.quit();
    return GLib.SOURCE_REMOVE;
  });
  return GLib.SOURCE_REMOVE;
});

GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
  if (!resolved) {
    print('HANG');
    server.disconnect();
    loop.quit();
  }
  return GLib.SOURCE_REMOVE;
});

loop.run();
