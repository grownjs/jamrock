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

interface BroadcastPatch {
  type: 'patch';
  key: string;
  data: unknown;
  direction: number;
  tabId: string;
}

function getDefaultTabId() {
  if (typeof sessionStorage !== 'undefined') {
    let value = sessionStorage.getItem('jamrock:tabId');
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem('jamrock:tabId', value);
    }
    return value;
  }
}

const BROADCAST_CHANNEL_NAME = 'jamrock:sync';
const TAB_ID = getDefaultTabId();

export function createFragment({ browser, patchNode, createElement }: FragmentDeps): FragmentAPI {
  const CACHED_FRAGMENTS: Map<string, FragmentNode> = new Map();
  let broadcastChannel: BroadcastChannel | null = null;

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
      return patchNode(el, el.__vnode, el.__vnode = data);
    }

    const frag = createElement(data);

    el.__anchors.push(...frag.childNodes);

    await frag.mount(el, direction < 0 ? el.firstChild : null);
  }

  async function patchWithBroadcast(ref: string, data: unknown, direction?: number, fromBroadcast = false): Promise<void> {
    await patch(ref, data, direction);
    if (!fromBroadcast && broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'patch',
        key: ref,
        data,
        direction: direction || 0,
        tabId: TAB_ID,
      } as BroadcastPatch);
    }
  }

  function handleBroadcastMessage(event: MessageEvent<BroadcastPatch>): void {
    const msg = event.data;
    if (msg.type === 'patch' && msg.tabId !== TAB_ID) {
      patch(msg.key, msg.data, msg.direction).catch(console.error);
    }
  }

  function teardown(): void {
    CACHED_FRAGMENTS.forEach(frag => {
      frag.__anchors.forEach(node => {
        if (node.isConnected) frag.removeChild(node);
      });
    });
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }

  function subscribe(): void {
    const nodes = document.querySelectorAll('x-fragment,[data-fragment]');

    nodes.forEach(node => {
      (node as FragmentNode).__vnode = browser.children(node);
      (node as FragmentNode).__anchors = [];
    });
    console.log(42);

    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.addEventListener('message', handleBroadcastMessage);
    }

    const queue = (window as any).__fq || [];
    queue.forEach((args: [string, unknown, number]) => patchWithBroadcast(args[0], args[1], args[2]));
    (window as any).__fq = [];
    (window as any).__f = patchWithBroadcast;
  }

  return { patch: patchWithBroadcast, teardown, subscribe };
}

if (typeof HTMLElement !== 'undefined') {
  class XFragment extends HTMLElement {}

  customElements.define('x-fragment', XFragment);
}
