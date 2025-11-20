import {
  At,
  Et,
  an,
  dn,
  fn,
  on,
  pn,
  vt
} from "./chunk-S3BAYXEE.js";

// src/client/fragment.mjs
function createFragment({ browser, patchNode, createElement }) {
  const CACHED_FRAGMENTS = /* @__PURE__ */ new Map();
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
      return patchNode(el, el.__vnode, el.__vnode = data);
    }
    const frag = createElement(data);
    el.__anchors.push(...frag.childNodes);
    await frag.mount(el, direction < 0 ? el.firstChild : null);
  }
  function teardown() {
    CACHED_FRAGMENTS.forEach((frag) => {
      frag.__anchors.forEach((node) => {
        if (node.isConnected) frag.removeChild(node);
      });
    });
  }
  function subscribe() {
    const nodes = document.querySelectorAll("x-fragment,[data-fragment]");
    nodes.forEach((node) => {
      node.__vnode = browser.children(node);
      node.__anchors = [];
    });
  }
  return { patch, teardown, subscribe };
}
if (typeof HTMLElement !== "undefined") {
  class XFragment extends HTMLElement {
  }
  customElements.define("x-fragment", XFragment);
}

// src/client/elements.mjs
function createRender() {
  const $ = pn(vt, dn(), fn({
    class: on,
    style: an
  }), [{
    element: (props, children) => {
      const tag = props.tag;
      delete props.tag;
      return [tag, props, children];
    },
    fragment: (props, children) => {
      if (props["@html"]) {
        const doc = document.createDocumentFragment();
        const div = document.createElement("div");
        div.innerHTML = props["@html"];
        [].slice.call(div.childNodes).forEach((node) => {
          doc.appendChild(node);
        });
        return doc;
      }
      return children;
    }
  }]);
  const $$ = (target, prev, next, svg) => Et(target, prev, next, svg, $);
  const $$$ = (el, vnode) => At(el, vnode, null, $);
  return {
    patchNode: $$,
    createElement: $,
    renderToElement: $$$
  };
}
export {
  createFragment,
  createRender
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaWVudC9mcmFnbWVudC5tanMiLCAiLi4vc3JjL2NsaWVudC9lbGVtZW50cy5tanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmFnbWVudCh7IGJyb3dzZXIsIHBhdGNoTm9kZSwgY3JlYXRlRWxlbWVudCB9KSB7XG4gIGNvbnN0IENBQ0hFRF9GUkFHTUVOVFMgPSBuZXcgTWFwKCk7XG5cbiAgZnVuY3Rpb24gZ2V0KHJlZikge1xuICAgIGxldCBub2RlID0gQ0FDSEVEX0ZSQUdNRU5UUy5nZXQocmVmKTtcbiAgICBpZiAoIShub2RlICYmIG5vZGUuaXNDb25uZWN0ZWQpKSB7XG4gICAgICBub2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgeC1mcmFnbWVudFtuYW1lPVwiJHtyZWZ9XCJdLFtkYXRhLWZyYWdtZW50PVwiJHtyZWZ9XCJdYCk7XG5cbiAgICAgIGlmICghbm9kZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZnJhZ21lbnQgdGFyZ2V0IGZvciAnJHtyZWZ9J2ApO1xuICAgICAgfVxuXG4gICAgICBub2RlLl9fdm5vZGUgPSBicm93c2VyLmNoaWxkcmVuKG5vZGUpO1xuICAgICAgbm9kZS5fX2FuY2hvcnMgPSBbXTtcbiAgICAgIENBQ0hFRF9GUkFHTUVOVFMuc2V0KHJlZiwgbm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcGF0Y2gocmVmLCBkYXRhLCBkaXJlY3Rpb24pIHtcbiAgICBjb25zdCBlbCA9IGdldChyZWYpO1xuXG4gICAgaWYgKCFkaXJlY3Rpb24pIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXR1cm4tYXNzaWduXG4gICAgICByZXR1cm4gcGF0Y2hOb2RlKGVsLCBlbC5fX3Zub2RlLCBlbC5fX3Zub2RlID0gZGF0YSk7XG4gICAgfVxuXG4gICAgY29uc3QgZnJhZyA9IGNyZWF0ZUVsZW1lbnQoZGF0YSk7XG5cbiAgICBlbC5fX2FuY2hvcnMucHVzaCguLi5mcmFnLmNoaWxkTm9kZXMpO1xuXG4gICAgYXdhaXQgZnJhZy5tb3VudChlbCwgZGlyZWN0aW9uIDwgMCA/IGVsLmZpcnN0Q2hpbGQgOiBudWxsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRlYXJkb3duKCkge1xuICAgIENBQ0hFRF9GUkFHTUVOVFMuZm9yRWFjaChmcmFnID0+IHtcbiAgICAgIGZyYWcuX19hbmNob3JzLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgIGlmIChub2RlLmlzQ29ubmVjdGVkKSBmcmFnLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzdWJzY3JpYmUoKSB7XG4gICAgY29uc3Qgbm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCd4LWZyYWdtZW50LFtkYXRhLWZyYWdtZW50XScpO1xuXG4gICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHtcbiAgICAgIG5vZGUuX192bm9kZSA9IGJyb3dzZXIuY2hpbGRyZW4obm9kZSk7XG4gICAgICBub2RlLl9fYW5jaG9ycyA9IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHsgcGF0Y2gsIHRlYXJkb3duLCBzdWJzY3JpYmUgfTtcbn1cblxuaWYgKHR5cGVvZiBIVE1MRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgY2xhc3MgWEZyYWdtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge31cblxuICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ3gtZnJhZ21lbnQnLCBYRnJhZ21lbnQpO1xufVxuIiwgImltcG9ydCB7XG4gIGJpbmQsIG1vdW50LCBwYXRjaCwgcmVuZGVyLCBzdHlsZXMsIGNsYXNzZXMsIGxpc3RlbmVycywgYXR0cmlidXRlcyxcbn0gZnJvbSAnLi4vdXRpbHMvY2xpZW50Lm1qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vZnJhZ21lbnQubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlbmRlcigpIHtcbiAgY29uc3QgJCA9IGJpbmQocmVuZGVyLCBsaXN0ZW5lcnMoKSwgYXR0cmlidXRlcyh7XG4gICAgY2xhc3M6IGNsYXNzZXMsXG4gICAgc3R5bGU6IHN0eWxlcyxcbiAgfSksIFt7XG4gICAgZWxlbWVudDogKHByb3BzLCBjaGlsZHJlbikgPT4ge1xuICAgICAgY29uc3QgdGFnID0gcHJvcHMudGFnO1xuICAgICAgZGVsZXRlIHByb3BzLnRhZztcbiAgICAgIHJldHVybiBbdGFnLCBwcm9wcywgY2hpbGRyZW5dO1xuICAgIH0sXG4gICAgZnJhZ21lbnQ6IChwcm9wcywgY2hpbGRyZW4pID0+IHtcbiAgICAgIGlmIChwcm9wc1snQGh0bWwnXSkge1xuICAgICAgICBjb25zdCBkb2MgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIGRpdi5pbm5lckhUTUwgPSBwcm9wc1snQGh0bWwnXTtcbiAgICAgICAgW10uc2xpY2UuY2FsbChkaXYuY2hpbGROb2RlcykuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICBkb2MuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZG9jO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgIH0sXG4gIH1dKTtcblxuICBjb25zdCAkJCA9ICh0YXJnZXQsIHByZXYsIG5leHQsIHN2ZykgPT4gcGF0Y2godGFyZ2V0LCBwcmV2LCBuZXh0LCBzdmcsICQpO1xuICBjb25zdCAkJCQgPSAoZWwsIHZub2RlKSA9PiBtb3VudChlbCwgdm5vZGUsIG51bGwsICQpO1xuXG4gIHJldHVybiB7XG4gICAgcGF0Y2hOb2RlOiAkJCxcbiAgICBjcmVhdGVFbGVtZW50OiAkLFxuICAgIHJlbmRlclRvRWxlbWVudDogJCQkLFxuICB9O1xu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
