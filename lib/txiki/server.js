import {
  createStore, createSession, createConnection, createResponse,
  parseLocation, parseCookies,
} from '../../dist/server.mjs';

async function handleConn(conn, handler) {
  const buffer = [];
  for await (const chunk of conn) {
    buffer.push(chunk);
    if (chunk.includes('\r\n\r\n')) break;
  }

  const requestText = new TextDecoder().decode(buffer.concat());
  const [requestLine, ...headers] = requestText.split('\r\n');
  const [method, url] = requestLine.split(' ');

  if (!method) {
    conn.close();
    return;
  }

  const headerObj = {};
  for (const header of headers) {
    const [key, value] = header.split(': ');
    if (key) headerObj[key.toLowerCase()] = value;
  }

  const req = new Request(`http://${headerObj.host || 'localhost'}${url}`, {
    method,
    headers: headerObj,
  });

  const resp = await handler.call(req);

  const statusText = { 200: 'OK', 404: 'Not Found', 500: 'Internal Server Error' }[resp.status] || '';

  let responseBody = '';
  if (resp.body) {
    if (typeof resp.body === 'string') {
      responseBody = resp.body;
    } else {
      const chunks = [];
      const reader = resp.body.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      responseBody = new TextDecoder().decode(chunks.concat());
    }
  }

  const responseHeaders = [];
  if (resp.headers) {
    resp.headers.forEach((v, k) => responseHeaders.push(`${k}: ${v}`));
  }
  responseHeaders.push(`Content-Length: ${responseBody.length}`);

  conn.write(`HTTP/1.1 ${resp.status} ${statusText}\r\n${responseHeaders.join('\r\n')}\r\n\r\n${responseBody}`);
  conn.close();
}

export async function createHandler(env, options) {
  const location = parseLocation(options);
  const store = await createStore({
    encode: async (v, s) => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(v));
      return btoa(String.fromCharCode(...new Uint8Array(sig)));
    },
    compare: (a, b) => a != null && b != null && a === b,
  }, options);

  const call = async (req, clients, teardown) => {
    req.headers = new Headers(req.headers);
    const cookies = parseCookies(req.headers.get('cookie') || '');
    const session = await createSession(store, cookies.sid || '$');
    const connObj = createConnection(store, session, cookies, options, req, location, teardown || (() => {}));
    const resp = await createResponse(env, connObj, clients || (() => []), options);
    await store.write(connObj.req.sid, connObj.session);
    return resp;
  };

  return {
    handler: { call },
    location,
  };
}

export async function createServer(env, options) {
  const { handler } = await createHandler(env, options);

  const server = tjs.listen('tcp', '0.0.0.0', options.port ?? 3000);

  if (!options.quiet) {
    console.log(`txiki.js ready — http://localhost:${options.port ?? 3000}`);
  }

  for await (const conn of server) {
    handleConn(conn, handler);
  }
}
