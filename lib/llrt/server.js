import {
  createStore, createSession, createConnection, createResponse,
  parseLocation, parseCookies,
} from '../../dist/server.mjs';

function lambdaEventToRequest(event) {
  const host = event.requestContext?.domainName || 'localhost';
  const path = event.rawPath || event.path || '/';
  const query = event.rawQueryString || event.rawQueryString || '';
  const url = `https://${host}${path}${query ? `?${query}` : ''}`;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const headers = new Headers(event.headers || {});

  let body = null;
  if (event.body) {
    body = event.isBase64Encoded ? atob(event.body) : event.body;
  }

  return new Request(url, { method, headers, body });
}

function responseToLambdaResult(resp) {
  const headers = {};
  resp.headers.forEach((v, k) => { headers[k] = v; });

  return {
    statusCode: resp.status,
    headers,
    body: resp.body || '',
  };
}

export async function createServer(env, options) {
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

  globalThis.handler = async event => {
    const request = lambdaEventToRequest(event);
    const cookies = parseCookies(request.headers.get('cookie') || '');
    const session = await createSession(store, cookies.sid || '$');
    const conn = createConnection(store, session, cookies, options, request, location, () => {});
    const resp = await createResponse(env, conn, options);
    await store.write(conn.req.sid, conn.session);

    const finalResp = resp instanceof Response ? resp : new Response(resp.body, {
      status: resp.status,
      headers: resp.headers,
    });

    return responseToLambdaResult(finalResp);
  };

  if (!options.quiet) {
    console.log('LLRT Lambda handler ready');
  }
}
