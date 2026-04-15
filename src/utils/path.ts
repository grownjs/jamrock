import { Is } from './server.ts';

// ---------------------------------------------------------------------------
// Pure path utilities — no I/O, no runtime deps. Work in every environment.
// These were previously static methods on Template; extracted here so Block
// and other modules can import them without creating a circular dependency.
// ---------------------------------------------------------------------------

export function join(...args: string[]): string {
  let parts: string[] = [];
  for (let i = 0, l = args.length; i < l; i++) {
    parts = parts.concat(args[i].split('/'));
  }

  const newParts: string[] = [];

  for (let i = 0, l = parts.length; i < l; i++) {
    const part = parts[i];
    if (!part || part === '.') continue;
    if (part === '..') newParts.pop();
    else newParts.push(part);
  }
  if (parts[0] === '') newParts.unshift('');
  return newParts.join('/') || (newParts.length ? '/' : '.');
}

export function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  if (parts.length === 0) return '.';
  if (parts.length === 1 && parts[0] === '') return '/';
  let result = parts.join('/');
  if (path.endsWith('/') && !result.endsWith('/')) result += '/';
  return result;
}

export function filename(path: string, ext?: string): string {
  const name = path.split('/').pop()!;
  return ext ? name.replace(ext, '') : name;
}

export function url(base_url: string, segment: string, timestamp?: boolean): string {
  return `/${[base_url, segment].join('/')}${timestamp ? `?_=${Date.now()}` : ''}`.replace(/\/+/g, '/');
}

export function cwd(): string {
  return typeof process === 'object' && typeof process.cwd === 'function' ? process.cwd() : '.';
}

export function relative(base: string, leaf?: string, _cwd?: string): string {
  const root = _cwd || cwd();
  if (!leaf) {
    return !base.includes(root) && root ? join(root, base) : base;
  }

  const c: string[] = [];
  const a = base.split('/');
  const b = leaf.split('/');

  let i = 0;
  for (; i < a.length && i < b.length; i++) {
    if (a[i] !== b[i]) break;
    c.push(a[i]);
  }

  const backtracks = Math.max(a.length - c.length - 1, 0);
  const diff = b.slice(c.length);
  const result = [...Array(backtracks).fill('..'), ...diff].join('/');
  return result || '.';
}

// ---------------------------------------------------------------------------
// HTTP response utilities — pure, no I/O.
// ---------------------------------------------------------------------------

export function plain(code: number, body: any, headers?: any): [number, any, any] {
  if (Is.plain(body)) {
    body = JSON.stringify(body);
    headers = {
      ...headers,
      'content-type': 'application/json',
      'content-length': body.length,
    };
  }
  return [code, body, headers];
}

export function response(body: any): any {
  if (Is.plain(body)) {
    body = plain(200, body);
  }
  if (Is.arr(body)) {
    const [status, _body, headers] = body as [number, any, any];
    body = new Response(_body, { status, headers });
  }
  if (Is.num(body)) body = new Response(null, { status: body });
  if (Is.str(body)) body = new Response(body, { status: 200 });
  return body;
}
