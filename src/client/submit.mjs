import { findNodes } from '../utils/client.mjs';

export function handleCleanup(el) {
  if ('reset' in el.dataset) el.value = null;
}

// FIXME: handle logic with bindings as well?
export async function handleSubmit(e) {
  if (e.target.checkValidity()) {
    const el = document.activeElement;
    const data = new FormData(e.target);

    const method = (el.form && (el.form.elements._method
      ? ((el.form.elements._method && el.form.elements._method.value) || 'POST')
      : el.form.method.toUpperCase()))
      || 'GET';

    if (el && el.form && el.name && (el.tagName === 'BUTTON' || el.type === 'submit')) {
      data.set(el.name, el.value);
    }

    let success;
    try {
      if ('trigger' in e.target.dataset) {
        const source = findNodes('source', e.target);

        await this.sockets.trigger(e, 'form', source ? source.dataset.source : null, e.target, data);
      } else {
        const url = e.target.action;
        const headers = { 'request-type': 'bind' };

        success = await this.loadURL(e.target, url, data, method, headers);
      }
    } finally {
      if (success) {
        for (const node of e.target.elements) handleCleanup(node);
      }
    }
  }
}
