import { handleCleanup } from './submit.mjs';

export function serializeBindings(node, payload, bindings) {
  if (bindings.has(node)) return;

  const keys = Object.keys(node.dataset);

  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].indexOf('bind:') === 0) {
      const param = node.dataset[keys[i]];
      const prop = keys[i].substr(5);

      bindings.add(node);

      if (node.type === 'file') {
        for (const file of node.files) {
          payload.append(param, file, file.name);
        }
      } else if (node[prop] !== false) {
        payload.append(param, node[prop]);
      }
      break;
    }
  }
}

export function handleEvent(e, kind) {
  if (
    'put' in e.target.dataset
    || 'post' in e.target.dataset
    || 'patch' in e.target.dataset
    || 'delete' in e.target.dataset
  ) {
    const _location = e.target.href
      || e.target.dataset.put
      || e.target.dataset.post
      || e.target.dataset.patch
      || e.target.dataset.delete;

    let method = 'GET';
    if (e.target.dataset.put) method = 'PUT';
    if (e.target.dataset.post) method = 'POST';
    if (e.target.dataset.patch) method = 'PATCH';
    if (e.target.dataset.delete) method = 'DELETE';

    return this.loadURL(e.target, null, null, method, null, _location);
  }

  if (e.target.tagName === 'A') {
    return this.loadURL(e.target, e.target.dataset.url, null, 'GET', {
      'request-type': 'link',
    }, e.target.href);
  }

  const keys = Object.keys(e.target.dataset);
  const bindings = new Set();

  let payload;
  let headers;
  for (let i = 0; i < keys.length; i += 1) {
    if (kind === keys[i].substr(3).toLowerCase()) {
      headers = { 'request-call': e.target.value, 'request-type': 'rpc' };
      break;
    }

    if (keys[i].indexOf('bind:') === 0) {
      payload = payload || new FormData(e.target.form || undefined);
      payload.delete('_method');
      break;
    }
  }

  if (payload) {
    serializeBindings(e.target, payload, bindings);
  }

  if (payload || headers) {
    const source = this.lookup('source', e.target);
    const trigger = this.lookup('trigger', e.target);

    if (source) {
      headers = headers || {};
      headers['request-from'] = source.dataset.source;
      if (e.target.dataset.key) headers['request-key'] = e.target.dataset.key;
    }

    if (!payload && e.target.form) {
      payload = new FormData(e.target.form);
    }

    const nodes = document.querySelectorAll('[data-binding]');

    nodes.forEach(node => {
      if (bindings.has(node)) return;
      payload = payload || new FormData();
      serializeBindings(node, payload, bindings);
      bindings.add(node);
    });

    bindings.forEach(handleCleanup);

    if (trigger) {
      return this.sockets.trigger(e, kind, source ? source.dataset.source : null, trigger, payload);
    }

    return this.loadURL(e.target, null, payload, 'PATCH', {
      'request-type': 'bind',
      ...headers,
    });
  }
}
