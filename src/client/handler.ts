import { handleCleanup } from './submit.ts';
import { findNodes } from '../utils/client.ts';

export function serializeBindings(node: any, payload: FormData, bindings: Set<any>, targetForm?: any): void {
  if (targetForm && targetForm.contains(node)) return;
  if (bindings.has(node)) return;
  bindings.add(node);

  const keys = Object.keys(node.dataset);

  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].indexOf('bind:') === 0) {
      const param = node.dataset[keys[i]];
      const prop = keys[i].substr(5);

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

export function handleEvent(this: any, e: any, kind: string): any {
  const throttle = findNodes('throttle', e.target) || null;

  if (throttle) {
    if ((throttle as any)._locked && e.type !== 'change') return;
    (throttle as any)._locked = setTimeout(() => { (throttle as any)._locked = null; }, +(throttle as HTMLElement).dataset.throttle! || 120);
  }

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

  let payload: FormData | undefined;
  let headers: Record<string, string> | undefined;
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
    serializeBindings(e.target, payload, bindings, e.target.form);
  }

  const trigger = findNodes('trigger', e.target);

  if (trigger && !e.target.closest('form[data-trigger]')) {
    payload = payload || new FormData(e.target.form || undefined);
    if (e.target.name && e.target.value !== undefined && !e.target.form) {
      payload.set(e.target.name, e.target.value);
    }
    const source = findNodes('source', e.target);
    return this.sockets.trigger(e, kind, source ? (source as HTMLElement).dataset.source : null, trigger, payload);
  }

  if (payload || headers) {
    const source = findNodes('source', e.target);

    if (source) {
      headers = headers || {};
      headers['request-from'] = (source as HTMLElement).dataset.source!;
      if (e.target.dataset.key) headers['request-key'] = e.target.dataset.key;
    }

    if (!payload && e.target.form) {
      payload = new FormData(e.target.form);
    }

    const nodes = document.querySelectorAll('[data-binding]');

    nodes.forEach(node => {
      if (bindings.has(node)) return;
      payload = payload || new FormData();
      serializeBindings(node, payload, bindings, e.target.form);
    });

    bindings.forEach(handleCleanup);

    const form = e.target.tagName === 'FORM' || e.target.form
      ? (e.target.form || e.target)
      : null;

    const method = (form && (form.elements._method
      ? ((form.elements._method && form.elements._method.value) || 'POST')
      : form.method.toUpperCase()))
      || 'GET';

    return this.loadURL(e.target, form && form.action, payload, method, {
      'request-type': 'bind',
      ...headers,
    });
  }
}
