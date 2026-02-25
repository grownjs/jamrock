import { GLib, Soup } from './deps.ts';

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: string;
  headers?: Record<string, string>;
};

export async function fetch(_url: string, opts: FetchOptions = {}) {
  const session = new Soup.Session();
  const method = opts.method || 'GET';
  const msg = new Soup.Message({
    method: method || 'GET',
    uri: GLib.Uri.parse(_url, GLib.UriFlags.NONE),
  });

  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      msg.get_request_headers().append(key, value);
    }
  }

  // if (opts.body) {
  //   msg.set_request_body_from_bytes('application/octet-stream', new TextEncoder().encode(opts.body));
  // }

  return new Promise((resolve, reject) => {
    session.send_async(msg, GLib.PRIORITY_DEFAULT, null, (_s, res) => {
      try {
        const stream = session.send_finish(res);
        const bytes = stream.read_bytes(1024 * 1024, null);
        const body = new TextDecoder().decode(bytes.get_data());
        resolve(new Response(body, { status: msg.get_status() }));
      } catch (e) {
        reject(e);
      }
    });
  });
}
