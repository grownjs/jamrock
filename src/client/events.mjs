import { defer, after, lookup } from './helpers.mjs';
import { warn } from './debugger.mjs';
import { isArray } from '../utils.mjs';
import { Browser } from './browser.mjs';

// FIXME: port this feature... to handle form validation feedback!
// $('form').each(function allForms() {
//   const button = $(this).find('button[type=submit]');

//   $(this).change(function onChange(e) {
//     if (e.target.checkValidity()) {
//       $(e.target).parent().removeClass('invalid');
//     } else {
//       $(e.target).parent().addClass('invalid');
//     }
//     if (this.checkValidity()) {
//       button.removeAttr('disabled');
//     } else {
//       button.attr('disabled', true);
//     }
//   });
// });

function handle(kind) {
  return async e => {
    if (e.altKey && kind === 'click') {
      const ref = lookup('location', e.target);

      if (ref) {
        if (Browser.ws) {
          Browser.send(`rpc:open ${ref.dataset.location}`);
        } else {
          fetch(`/__open?@=${ref.dataset.location}`);
        }
      }
      e.preventDefault();
      return;
    }

    if (['INPUT', 'SELECT'].includes(e.target.tagName) && kind === 'click') return;
    if (!['A', 'INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
    if (e.target.tagName === 'SELECT' && kind === 'input') return;
    if (e.target.tagName === 'INPUT' && kind === 'change') return;

    if ('confirm' in e.target.dataset) {
      if (!confirm(e.target.dataset.confirm)) return; // eslint-disable-line
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

      e.preventDefault();
      return Browser.load(e.target, null, null, method, null, _location);
    }

    if (e.target.tagName === 'A') {
      if (
        (e.metaKey || e.ctrlKey || e.button !== 0)
        || e.target.protocol !== window.location.protocol
        || e.target.host !== window.location.host
        || e.target.hasAttribute('target')
      ) return;

      e.preventDefault();
      return Browser.load(e.target, e.target.dataset.url, null, 'GET', {
        'request-type': 'link',
      }, e.target.href);
    }

    const keys = Object.keys(e.target.dataset);

    let payload;
    let headers;
    for (let i = 0; i < keys.length; i += 1) {
      if (kind === keys[i].substr(2).toLowerCase()) {
        headers = { 'request-call': e.target.value };
        break;
      }

      if (/^bind[A-Z]/.test(keys[i])) {
        const prop = keys[i][4].toLowerCase() + keys[i].substr(5);
        const param = e.target.dataset[keys[i]];

        payload = new FormData();
        if (e.target.type === 'file') {
          for (const file of e.target.files) {
            payload.append(param, file, file.name);
          }
          e.target.value = null;
        } else {
          payload.append(param, e.target[prop]);
        }
        break;
      }
    }

    if (payload || headers) {
      e.preventDefault();

      const source = lookup('source', e.target);
      const trigger = lookup('trigger', e.target);

      if (source) {
        headers = headers || {};
        headers['request-from'] = source.dataset.source;
      }

      if (trigger) {
        const key = `on${kind}`;
        const data = trigger.dataset;

        for (let prop in data) {
          if (/^field[A-Z]/.test(prop)) {
            payload = payload || new FormData();
            payload.append(prop.substr(5), data[prop]);
          }
        }

        const id = `#${Date.now().toString(13)}`;
        const fn = (data[key] && !data[key].includes(key) ? data[key] : null) || data.trigger;
        const frag = (source || trigger).dataset.source || '';

        Browser.send(`rpc:trigger ${fn} ${id} ${frag}\t${JSON.stringify(payload)}`, () => {
          if (!Browser.ws) return;
          Browser.ws[id] = defer();
          Browser.ws[id]
            .catch(_e => _e && warn(_e, 'RPC Failure'))
            .then(() => { delete Browser.ws[id]; });

          setTimeout(() => {
            if (Browser.ws[id]) {
              Browser.ws[id].reject();
              delete Browser.ws[id];
            }
          }, 1000);
        });
        return;
      }

      return Browser.load(e.target, null, payload, 'PATCH', {
        'request-type': 'bind',
        ...headers,
      });
    }
  };
}

const fns = {};
function onHandle(e, cb) {
  const fn = cb || fns[e] || (fns[e] = handle(e)); // eslint-disable-line
  removeEventListener(e, fn, false);
  addEventListener(e, fn, false);
}
function onSubmit(e) {
  if (
    'confirm' in e.target.dataset
    || 'async' in e.target.dataset
    || 'trigger' in e.target.dataset
  ) {
    e.preventDefault();

    if (e.target.checkValidity()) {
      const el = document.activeElement;
      const data = new FormData(e.target);
      const method = (e.target.getAttribute('method') || e.target.method).toUpperCase();

      if (el && el.form && el.name && (el.tagName === 'BUTTON' || el.type === 'submit')) {
        data.set(el.name, el.value);
      }

      if (e.target.dataset.trigger) {
        const payload = {};

        data.forEach((value, key) => {
          if (!(key in payload)) {
            payload[key] = value;
            return;
          }
          if (!isArray(payload[key])) {
            payload[key] = [payload[key]];
          }
          payload[key].push(value);
        });

        const id = Date.now();
        const fn = e.target.dataset.trigger;
        const frag = e.target.dataset.source || '';

        Browser.send(`rpc:trigger ${fn} ${id} ${frag}\t${JSON.stringify(payload)}`, () => {
          after(lookup('confirm', e.target) || e.target, e.target.dataset.async);

          if (!Browser.ws) return;

          Browser.ws[id] = defer();
          Browser.ws[id]
            .catch(_e => _e && warn(_e, 'RPC Failure'))
            .then(() => { delete Browser.ws[id]; });

          setTimeout(() => {
            if (Browser.ws[id]) {
              Browser.ws[id].reject();
              delete Browser.ws[id];
            }
          }, 1000);
        });
        return;
      }

      Browser.load(e.target, null, data, method, null, e.target.getAttribute('action'), _el => {
        after(_el, e.target.dataset.async);
      });
    }
  }
}

['click', 'input', 'change'].forEach(e => onHandle(e));

onHandle('submit', onSubmit);
onHandle('popstate', () => {
  Browser.REQUEST_CALL = null;
  Browser.reload();
});

window.onbeforeunload = () => Browser.end();
