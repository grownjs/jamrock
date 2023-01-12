export function handleCleanup(el) {
  if ('reset' in el.dataset) el.value = null;
}

export function handleSubmit(e) {
  if (e.target.checkValidity()) {
    const el = document.activeElement;
    const data = new FormData(e.target);

    const method = 'async' in e.target.dataset
      ? ((el.form && el.form.elements._method && el.form.elements._method.value) || 'POST')
      : (e.target.getAttribute('method') || e.target.method).toUpperCase();

    if (el && el.form && el.name && (el.tagName === 'BUTTON' || el.type === 'submit')) {
      data.set(el.name, el.value);
    }

    for (const node of e.target.elements) handleCleanup(node);

    if ('trigger' in e.target.dataset) {
      const source = this.lookup('source', e.target);

      this.sockets.trigger(e, 'form', source ? source.dataset.source : null, e.target, data);
      return;
    }

    const url = e.target.getAttribute('action');
    const headers = { 'request-type': 'bind' };

    this.loadURL(e.target, null, data, method, headers, url);
  }
}
