export function createFragment({ browser, patchNode, createElement }) {
  const CACHED_FRAGMENTS = new Map();

  function get(ref) {
    let node = CACHED_FRAGMENTS.get(ref);
    if (!(node && node.isConnected)) {
      node = document.querySelector(`x-fragment[name="${ref}"],[data-fragment="${ref}"]`);

      if (!node) {
        throw new Error(`Missing fragment target for '${ref}'`);
      }

      node.__vnode = browser.children(node);
      node.__anchors = [];
      CACHED_FRAGMENTS.set(ref, node);
    }
    return node;
  }

  async function patch(ref, data, direction) {
    const el = get(ref);

    if (!direction) {
      // eslint-disable-next-line no-return-assign
      return patchNode(el, el.__vnode, el.__vnode = data);
    }

    const frag = createElement(data);

    el.__anchors.push(...frag.childNodes);

    await frag.mount(el, direction < 0 ? el.firstChild : null);
  }

  function teardown() {
    CACHED_FRAGMENTS.forEach(frag => {
      frag.__anchors.forEach(node => {
        if (node.isConnected) frag.removeChild(node);
      });
    });
  }

  function subscribe() {
    const nodes = document.querySelectorAll('x-fragment,[data-fragment]');

    nodes.forEach(node => {
      node.__vnode = browser.children(node);
      node.__anchors = [];
    });
  }

  return { patch, teardown, subscribe };
}

if (typeof HTMLElement !== 'undefined') {
  class XFragment extends HTMLElement {}

  customElements.define('x-fragment', XFragment);
}
