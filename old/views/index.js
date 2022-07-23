import LiveSocket from './livesocket';
import Fragment from './fragment';
import Browser from './browser';

import './events';

function main() {
  const { href } = location;
  const url = href.replace(/[&?]noscript(?:=[^&?=]*?)?/, '');

  if (url !== href) {
    location.href = url;
  } else if (window.req_uuid) {
    Browser.init(LiveSocket.getInstance().ws);
  }
}

function mount(id, ref, props, children) {
  LiveSocket.ready(() => {
    const el = document.getElementById(ref);
    const Elem = window.Jamrock.components[id];

    if (Elem && el) {
      Elem.mount(el, props, children);
    } else {
      console.error('E_MOUNT', {
        Elem, el, id, ref, props, children,
      });
    }
  });
}

function ready(callback) {
  LiveSocket.ready(callback);
}

window.Jamrock = window.Jamrock || {
  components: Object.create(null),
  LiveSocket,
  Fragment,
  Browser,
  mount,
  ready,
};

if (['complete', 'loaded', 'interactive'].includes(document.readyState)) {
  main();
} else {
  document.addEventListener('DOMContentLoaded', () => main());
}
