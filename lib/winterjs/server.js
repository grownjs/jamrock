import {
  createStore, createSession, createConnection, createResponse,
  parseLocation, parseCookies,
} from '../../dist/server.mjs';

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

  addEventListener('fetch', event => {
    event.respondWith((async () => {
      const { request } = event;
      const cookies = parseCookies(request.headers.get('cookie') || '');
      const session = await createSession(store, cookies.sid || '$');
      const conn = createConnection(store, session, cookies, options, request, location, () => {});
      const resp = await createResponse(env, conn, options);
      await store.write(conn.req.sid, conn.session);
      return resp instanceof Response ? resp : new Response(resp.body, {
        status: resp.status,
        headers: resp.headers,
      });
    })());
  });

  if (!options.quiet) {
    console.log('WinterJS ready — port configured via winterjs CLI flag');
  }
}
