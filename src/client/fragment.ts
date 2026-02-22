interface FragmentDeps {
  browser: { children(node: Element): unknown };
  patchNode: (el: Element, prev: unknown, next: unknown) => void;
  createElement: (data: unknown) => DocumentFragment & { mount(parent: Element, ref: Node | null): Promise<void> };
}

interface FragmentNode extends Element {
  __vnode: unknown;
  __anchors: Node[];
}

interface FragmentAPI {
  patch: (ref: string, data: unknown, direction?: number) => Promise<void>;
  teardown: () => void;
  subscribe: () => void;
}

export function createFragment({ browser, patchNode, createElement }: FragmentDeps): FragmentAPI {
  const CACHED_FRAGMENTS: Map<string, FragmentNode> = new Map();

  function get(ref: string): FragmentNode {
    let node = CACHED_FRAGMENTS.get(ref);
    if (!(node && node.isConnected)) {
      node = document.querySelector(`x-fragment[name="${ref}"],[data-fragment="${ref}"]`) as FragmentNode | null;

      if (!node) {
        throw new Error(`Missing fragment target for '${ref}'`);
      }

      node.__vnode = browser.children(node);
      node.__anchors = [];
      CACHED_FRAGMENTS.set(ref, node);
    }
    return node;
  }

  async function patch(ref: string, data: unknown, direction?: number): Promise<void> {
    const el = get(ref);

    if (!direction) {
      // eslint-disable-next-line no-return-assign
      return patchNode(el, el.__vnode, el.__vnode = data);
    }

    const frag = createElement(data);

    el.__anchors.push(...frag.childNodes);

    await frag.mount(el, direction < 0 ? el.firstChild : null);
  }

  function teardown(): void {
    CACHED_FRAGMENTS.forEach(frag => {
      frag.__anchors.forEach(node => {
        if (node.isConnected) frag.removeChild(node);
      });
    });
  }

  function subscribe(): void {
    const nodes = document.querySelectorAll('x-fragment,[data-fragment]');

    nodes.forEach(node => {
      (node as FragmentNode).__vnode = browser.children(node);
      (node as FragmentNode).__anchors = [];
    });

    const queue = (window as any).__fq || [];
    queue.forEach((args: [string, unknown, number]) => patch(args[0], args[1], args[2]));
    (window as any).__fq = [];
    (window as any).__f = patch;
  }

  return { patch, teardown, subscribe };
}

if (typeof HTMLElement !== 'undefined') {
  class XFragment extends HTMLElement {}

  customElements.define('x-fragment', XFragment);
}
