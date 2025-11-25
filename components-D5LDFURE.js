import {
  _Is,
  flatten,
  sleep
} from "./chunk-OPYNACR3.js";

// node_modules/nohooks/index.js
var contextStack = [];
function getContext() {
  const scope = contextStack[contextStack.length - 1];
  if (!scope) {
    throw new Error("Cannot invoke hooks outside createContext()");
  }
  return scope;
}
function pop(scope) {
  contextStack[contextStack.indexOf(scope)] = null;
}
function push(scope) {
  contextStack.push(scope);
}
function isObj(value) {
  return value !== null && typeof value === "object";
}
function undef(value) {
  return typeof value === "undefined" || value === null;
}
function clone(value) {
  if (!value || !isObj(value)) return value;
  if (Array.isArray(value)) return value.map((x) => clone(x));
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  return Object.keys(value).reduce((memo, k) => Object.assign(memo, { [k]: clone(value[k]) }), {});
}
function equals(a, b) {
  if (typeof a !== typeof b) return;
  if (a instanceof Array) {
    if (a.length !== b.length) return;
    for (let i = 0; i < a.length; i += 1) {
      if (!equals(a[i], b[i])) return;
    }
    return true;
  }
  if (a && b && a.constructor === Object) {
    const x = Object.keys(a).sort();
    if (!equals(x, Object.keys(b).sort())) return;
    for (let i = 0; i < x.length; i += 1) {
      if (!equals(a[x[i]], b[x[i]])) return;
    }
    return true;
  }
  return a === b;
}
var Context = class {
  constructor(args, render, callback) {
    const scope = this;
    scope.c = 0;
    function end(skip) {
      try {
        scope.get.forEach((fx) => {
          if (fx.off && !fx.once) {
            fx.off();
            fx.off = null;
          }
          if (fx.once && fx.cb && !fx.off) {
            const retval = fx.cb();
            fx.once = false;
            if (typeof retval === "function") {
              fx.off = retval;
            }
          }
          if (skip === null && fx.on && fx.cb) {
            const retval = fx.cb();
            fx.on = false;
            if (typeof retval === "function") {
              fx.off = retval;
            }
          }
          if (skip === false && fx.off) {
            fx.off();
            fx.off = null;
          }
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }
    let deferred;
    function next(promise) {
      promise.catch((e) => {
        if (scope.get) setTimeout(() => end(true));
        if (scope.onError) {
          scope.onError(e);
        } else {
          throw e;
        }
      }).then(() => {
        deferred = null;
      });
    }
    function after(clear) {
      if (scope.get) next(Promise.resolve(end(clear)));
    }
    scope.equals = () => equals(scope.val, scope.old);
    scope.defer = (ms) => Promise.resolve().then(() => new Promise((ok) => setTimeout(() => ok(scope), ms)));
    scope.clear = () => {
      if (scope.get) after(false);
    };
    scope.loop = () => {
      scope.set = scope.set || (() => Promise.resolve().then(() => scope.equals() || scope.loop()));
      scope.old = clone(scope.val);
      scope.key = 0;
      scope.fx = 0;
      scope.m = 0;
      scope.c += 1;
      push(scope);
      try {
        scope.result = render(...args);
        const key = [scope.key, scope.fx, scope.m].join(".");
        if (!scope.hash) {
          scope.hash = key;
        } else if (scope.hash !== key) {
          throw new Error("Hooks must be called in a predictable way");
        }
        return scope.result;
      } catch (e) {
        throw new Error(`Unexpected failure in context
${e.message}`);
      } finally {
        pop(scope);
        after(null);
      }
    };
    let context = [];
    scope.sync = () => {
      deferred = next(scope.set(scope, ...context));
      return deferred;
    };
    scope.run = (..._args) => {
      context = _args;
      scope.loop();
      return scope;
    };
    callback(scope.run, (sync) => {
      scope.set = sync;
    }, scope);
  }
};
function createContext(render, callback = (fn) => fn()) {
  if (typeof render !== "function" || typeof callback !== "function") {
    throw new TypeError("Invalid input for createContext()");
  }
  return (...args) => new Context(args, render, callback);
}
function onError(callback) {
  getContext().onError = callback;
}
function useMemo(callback, inputs) {
  const scope = getContext();
  const key = scope.m;
  scope.m += 1;
  scope.v = scope.v || [];
  scope.d = scope.d || [];
  const prev = scope.d[key];
  if (undef(prev) || !equals(prev, inputs)) {
    scope.v[key] = callback();
    scope.d[key] = inputs;
  }
  return scope.v[key];
}
function useRef(result) {
  return useMemo(() => {
    let value = clone(result);
    return Object.defineProperty({}, "current", {
      configurable: false,
      enumerable: true,
      set: (ref) => {
        value = ref;
      },
      get: () => value
    });
  }, []);
}
function useState(fallback) {
  const scope = getContext();
  const key = scope.key;
  scope.key += 1;
  scope.val = scope.val || [];
  if (undef(scope.val[key])) {
    scope.val[key] = fallback;
  }
  return [scope.val[key], (v) => {
    if (typeof v === "function") {
      scope.val[key] = v(scope.val[key]);
    } else {
      scope.val[key] = v;
    }
    scope.sync();
    return scope.val[key];
  }];
}
function useEffect(callback, inputs) {
  const scope = getContext();
  const key = scope.fx;
  scope.fx += 1;
  scope.in = scope.in || [];
  scope.get = scope.get || [];
  const prev = scope.in[key];
  const scoped = !inputs || !inputs.length;
  const enabled = !scoped && !equals(prev, inputs);
  scope.in[key] = inputs;
  scope.get[key] = scope.get[key] || {};
  Object.assign(scope.get[key], { cb: callback, on: enabled, once: scoped });
}

// src/render/hooks.mjs
function str(value) {
  if (!_Is.value(value)) value = Object.prototype.toString.call(value);
  if (!_Is.str(value)) value = value.toString();
  return value;
}
function ents(value) {
  return str(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var execute = (element, loader, next, run) => {
  const self = {
    $: (value) => {
      if (value === null || value === false || typeof value === "undefined") return "";
      if (value.current) value = value.current;
      if (!_Is.scalar(value)) {
        return _Is.arr(value) ? value.map(self.$).join("") : Object.prototype.toString.call(value);
      }
      return _Is.str(value) ? ents(value) : value.toString();
    },
    d: (value) => {
      if (typeof window === "undefined") console.debug("E_DEBUG", value);
      return ents(JSON.stringify(value, null, 2));
    },
    r: (value) => {
      if (_Is.empty(value)) return;
      return _Is.func(value) ? value : () => value;
    },
    e: (tag, props, children) => {
      return element ? element(tag, props, children) : [tag, props, children];
    },
    h: (value) => {
      return _Is.arr(value) ? value : ["fragment", { "@html": String(value) }];
    },
    if: (cond, then, ...branches) => {
      if (cond) return run(then(), []);
      const fallback = branches.pop();
      let otherwise;
      for (const block of branches) {
        const result = block && block();
        if (result) {
          otherwise = result;
          break;
        }
      }
      return run(otherwise || fallback && fallback(), []);
    },
    map: (subj, body, fallback) => {
      function it(_, offset) {
        return run(body, [_, offset]);
      }
      if (_Is.plain(subj)) {
        const items = Object.entries(subj);
        return items.length ? run(items.map(([k, v]) => it(v, k)), []) : run(fallback && fallback(), []);
      }
      let input = [];
      if (subj?.current) subj = subj.current;
      if (_Is.iterable(subj) || _Is.arr(subj)) input = [...subj];
      else if (_Is.num(subj)) input = Array.from({ length: subj }).map((_, i) => i);
      return input.length ? run(input.map(it), []) : run(fallback && fallback(), []);
    },
    block: (tpl, name, props, _children) => {
      if (!tpl) throw new Error(`Missing '${name}' component`);
      if (_children) props.children = () => _children;
      return run(next(tpl, props, loader, self), []);
    }
  };
  return (tpl, props, label = "unknown") => {
    if (!tpl) {
      throw new TypeError(`Invalid template (${label})`);
    }
    return run(tpl(self, props), []);
  };
};

// src/render/async.mjs
async function execAsync(chunk, ctx, _) {
  let result = await chunk;
  if (_Is.func(result) && !result.name) {
    result = await result.apply(void 0, ctx);
  }
  if (_Is.arr(result)) {
    result = await Promise.all(result.map((item) => execAsync(item, ctx, _)));
  }
  return result;
}
var executeAsync = (tag, loader, callback) => execute(tag, loader, callback, execAsync);

// src/client/render.mjs
function wrapComponent(_, loop) {
  return this.createContext(loop, (sync, update) => {
    let deferred = Promise.resolve();
    update((self) => {
      if (!self.equals()) {
        deferred = deferred.then(() => self.loop()).then((data) => self.patch(data));
      }
      return deferred;
    });
    return sync();
  });
}
function clientComponent(mod, context, filepath) {
  if (!mod) {
    console.log("E_MOD", { context, filepath });
    return { mount: (el) => el };
  }
  const loader = (x) => x === "jamrock" ? this : context.loader?.(x) || import(x);
  const render = executeAsync(null, loader, async (child, props) => {
    if (!child) {
      console.log("E_CHILD", props, child);
      return [];
    }
    let data = props;
    if (child.__handler) {
      console.log("CHILD", child);
    }
    return render(child.__template, data, child.__src);
  });
  const next = (data) => render(mod.__template, data, mod.__src);
  const mount = async (el, props, _events) => {
    if (el.__state) {
      throw new Error("Component already mounted");
    }
    let vnode;
    if (mod.__handler) {
      const main = await mod.__handler({ ...props }, loader, el);
      const store = await main.__self();
      const data = await store.loop();
      store.patch = async (peek) => {
        Object.assign(el.__state, peek.__scope);
        const patch = await next(el.__state);
        el.current = peek.__default;
        return typeof process !== "undefined" ? this.patchNode(el, vnode, vnode = patch) : requestAnimationFrame(() => this.patchNode(el, vnode, vnode = patch));
      };
      if (el.__store) el.__store.clear();
      el.current = data.__default;
      el.__state = { ...props, ...data.__scope };
      el.__store = store;
    }
    el.__defer = el.__defer || Promise.resolve();
    el.__update = (_mod, _props) => {
      console.log("[UPDATE]", _props);
      if (el.__store) el.__store.clear();
      el.__state = null;
      el.__defer = el.__defer.then(() => clientComponent.call(this, _mod, context).mount(el, _props));
    };
    vnode = await next(el.__state);
    if (context?.sync) {
      context.sync(vnode, _events);
    } else {
      this.renderToElement(el, vnode);
    }
    return el;
  };
  return { mount };
}
function mountableComponent(mod, context, filepath) {
  return clientComponent.call(this, mod, context, filepath);
}

// src/client/components.mjs
var HAS_INTER_OBSERVERS = "IntersectionObserver" in window;
var HAS_REQUEST_IDLE = "requestIdleCallback" in window;
var HAS_MATCH_MEDIA = "matchMedia" in window;
var HAS_CONNECTION = "connection" in navigator;
var DEFAULT_EVENTS = ["click", "focusin", "touchstart"];
var CONDITIONS_MAP = ["idle", "visible", "media", "savedata", "interaction"];
var Conditions = class _Conditions {
  static is(node) {
    return node.dataset && ("component" in node.dataset || "enhance" in node.dataset || "reset" in node.dataset || "use" in node.dataset) || _Is.func(node.__destroy);
  }
  static has(node) {
    for (const key in node.dataset) {
      if (key.indexOf("use:") === 0 || key.indexOf("is:") === 0) return true;
      if (key.indexOf("on:") === 0 && CONDITIONS_MAP.includes(key.substr(3))) return true;
    }
  }
  static get(node) {
    const hooks = [];
    Object.keys(node.dataset).forEach((key) => {
      if (key.indexOf("is:") === 0) hooks.push(["reset", { attr: key.substr(3) }]);
      if (key.indexOf("use:") === 0) hooks.push(["hook", { name: key.substr(4), source: node.dataset[key] }]);
      if (key.indexOf("on:") === 0 && CONDITIONS_MAP.includes(key.substr(3))) hooks.push([key.substr(3), node.dataset[key]]);
    });
    return hooks;
  }
  static map(node) {
    return _Conditions.get(node).reduce((memo, [k, v]) => {
      memo.push(_Conditions[k](node, v === "true" ? "" : v));
      return memo;
    }, []);
  }
  static hook(node, params) {
    return Promise.resolve({ node, params });
  }
  static reset(node, params) {
    node.removeAttribute(params.attr);
    node.removeAttribute("data-reset");
    node.removeAttribute(`data-is:${params.attr}`);
  }
  static idle(_, ready) {
    const onload = new Promise((resolve) => {
      if (document.readyState !== "complete") {
        addEventListener("load", () => resolve(), { once: true });
      } else {
        resolve();
      }
    });
    return ready !== false && HAS_REQUEST_IDLE ? Promise.all([new Promise((resolve) => requestIdleCallback(resolve)), onload]) : onload;
  }
  static ready() {
    return _Conditions.idle(null, false);
  }
  static media(_, query) {
    let q = { matches: true };
    if (query && HAS_MATCH_MEDIA) {
      q = window.matchMedia(query);
    }
    if (!q.matches) {
      return new Promise((resolve) => {
        q.addListener((e) => e.matches && resolve());
      });
    }
  }
  static visible(el) {
    if (HAS_INTER_OBSERVERS) {
      return new Promise((resolve) => {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            resolve();
          }
        });
        observer.observe(el);
      });
    }
  }
  static savedata(_, expects) {
    return !HAS_CONNECTION || navigator.connection.saveData === (expects !== "false") || sleep();
  }
  static interaction(el, overrides) {
    let events = DEFAULT_EVENTS;
    if (overrides) {
      events = (overrides || "").split(/[,|]/).map((entry) => entry.trim());
    }
    return new Promise((resolve) => {
      function next(event, cb) {
        for (const name of events) el.removeEventListener(name, cb);
        resolve(event);
      }
      let t;
      function skip(e, cb) {
        const ev = { x: e.x, y: e.y, tag: e.target.tagName, type: e.type };
        if (e.type === "click") return next(ev, cb);
        clearTimeout(t);
        t = setTimeout(() => next(ev, cb), 150);
      }
      function onEvent(e) {
        if (events.includes(e.type)) skip(e, onEvent);
      }
      for (const name of events) {
        el.addEventListener(name, onEvent, { once: true });
      }
    });
  }
};
var Components = class {
  constructor(browser, prefix, { __defaults, __scripts, __calls }) {
    this.headless = browser.headless;
    this.browser = browser;
    this.prefix = prefix;
    this.calls = __calls || {};
    this.scripts = __scripts || {};
    this.defaults = __defaults || {};
    this.observer = new MutationObserver((list) => {
      for (const mutation of list) {
        const { addedNodes, removedNodes, target } = mutation;
        addedNodes.forEach((node) => Conditions.is(node) && this.append(node));
        removedNodes.forEach((node) => Conditions.is(node) && this.delete(node));
        if (!this.elements.has(target) && Conditions.is(target)) this.append(target);
      }
    });
    this.loaded = /* @__PURE__ */ new Map();
    this.modules = /* @__PURE__ */ new Map();
    this.imports = [];
    this.on();
  }
  rebase(url, reload) {
    const q = reload || this.modules.has(url) ? `?_=${Date.now()}` : "";
    const path = `/${this.prefix}/${url}${q}`;
    return path;
  }
  async resolve(key) {
    await this.import(key);
    return this.loaded.get(key);
  }
  async import(url, reload) {
    console.log("[ESM]", url);
    const path = this.rebase(url, reload);
    if (!this.imports[path]) {
      const src = path.replace(/\.(?:md|html)(?:\/\d+)?/, ".bundled.mjs");
      this.imports[path] = Date.now();
      let mod = await import(src);
      mod = mod.default || mod;
      this.modules.set(url, mod);
      if (url.includes(".md") || url.includes(".html")) {
        const old = this.loaded.get(url);
        this.defaults[url] = { ...mod.__data, ...this.defaults[url] };
        this.loaded.set(url, { ...old, ...mod, __data: this.defaults[url] });
      }
    }
    if (!this.modules.has(url)) {
      return sleep().then(() => this.import(url));
    }
    return this.modules.get(url);
  }
  async load(node, events) {
    node.__pending = null;
    if (node.dataset.component) {
      const [key] = node.dataset.component.split(":");
      const src = key.replace(/\/\d+$/, "");
      const mod = await this.resolve(key);
      try {
        if (node.__update) {
          await node.__update(mod, mod.__data);
        } else {
          await this.attach(mod, node, mod.__data, src);
        }
        requestAnimationFrame(() => this.hooks(node, events));
      } catch (e) {
        console.warn(e.message);
      }
    } else if ("enhance" in node.dataset) {
      requestAnimationFrame(() => this.hooks(node, events));
    } else if ("use" in node.dataset) {
      this.ref(node, node.dataset.use);
    }
  }
  on() {
    this.elements = /* @__PURE__ */ new Set([...document.querySelectorAll("[data-component],[data-enhance],[data-reset],[data-use]")]);
    requestAnimationFrame(() => this.elements.forEach((node) => Conditions.is(node) && this.append(node)));
    requestAnimationFrame(() => this.browser.scripts(this.scripts));
    this.observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true
    });
  }
  off() {
    if (this.observer) this.observer.disconnect();
    this.elements.forEach((node) => this.delete(node));
  }
  set(defaults, calls, scripts, fragments) {
    console.log("[FRAGMENTS]", fragments);
    if (calls) Object.assign(this.calls, calls);
    if (scripts) Object.assign(this.scripts, scripts);
    if (defaults) Object.assign(this.defaults, defaults);
  }
  ref(node, script) {
    this.import(script).then((hook) => {
      if (hook.__execute) return hook.__execute(node);
    });
  }
  hooks(node, events) {
    if (node.__hooks) {
      node.__hooks.forEach((fn) => fn());
    }
    node.__hooks = [];
    return Promise.all(events.reduce((memo, ev) => {
      if (ev?.type === "click") {
        const el = document.elementFromPoint(ev.x, ev.y);
        if (el.tagName === ev.tag) el.click();
      }
      if (ev?.node) {
        const key = ev.params.source;
        const src = key.replace(/\.(?:md|html)(?:\/\d+)?$/, ".hooks.mjs");
        memo.push(this.import(src).then((mod) => {
          const off = mod[ev.params.name](node);
          if (_Is.func(off)) node.__hooks.push(off);
        }));
      }
      return memo;
    }, []));
  }
  reload(source) {
    console.log("[HMR]", source);
    this.modules = /* @__PURE__ */ new Map();
    this.imports = [];
  }
  refetch() {
    console.log("[REFETCH]");
    this.reload();
  }
  attach(mod, node, state, filepath) {
    if (!(window.Jamrock.Runtime && window.Jamrock.Runtime.mountableComponent)) {
      return sleep().then(() => this.attach(mod, node, state, filepath));
    }
    const component = window.Jamrock.Runtime.mountableComponent(mod, {
      sync: (vdom) => this.browser.patch(node, vdom)
    }, filepath);
    return component.mount(node, state);
  }
  append(node) {
    if (!this.loaded) {
      this.loaded = true;
      this.browser.runtime().then(() => {
        Object.assign(window.Jamrock.Runtime, {
          onError,
          useRef,
          useMemo,
          useState,
          useEffect,
          createContext,
          wrapComponent,
          mountableComponent
        });
      });
    }
    this.elements.add(node);
    this.refresh(node);
  }
  refresh(node) {
    if (node.__pending) return;
    node.__pending = true;
    if (!Conditions.has(node)) {
      Conditions.ready().then(() => this.load(node, []));
    } else {
      Promise.all(Conditions.map(node)).then((...set) => this.load(node, flatten(set)));
    }
  }
  delete(node) {
    node.dispatchEvent(new CustomEvent("teardown"));
    this.elements.delete(node);
    if (node.__hooks) {
      node.__hooks.forEach((fn) => fn());
      node.__hooks = null;
    }
    if (node.__store) {
      node.__store.clear();
      node.__store = null;
    }
  }
  clear() {
    this.elements.forEach((node) => this.delete(node));
  }
};
export {
  Components,
  Conditions
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbm9kZV9tb2R1bGVzL25vaG9va3MvaW5kZXguanMiLCAiLi4vc3JjL3JlbmRlci9ob29rcy5tanMiLCAiLi4vc3JjL3JlbmRlci9hc3luYy5tanMiLCAiLi4vc3JjL2NsaWVudC9yZW5kZXIubWpzIiwgIi4uL3NyYy9jbGllbnQvY29tcG9uZW50cy5tanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IGNvbnRleHRTdGFjayA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGV4dCgpIHtcbiAgY29uc3Qgc2NvcGUgPSBjb250ZXh0U3RhY2tbY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuXG4gIGlmICghc2NvcGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBpbnZva2UgaG9va3Mgb3V0c2lkZSBjcmVhdGVDb250ZXh0KCknKTtcbiAgfVxuICByZXR1cm4gc2NvcGU7XG59XG5cbmZ1bmN0aW9uIHBvcChzY29wZSkge1xuICBjb250ZXh0U3RhY2tbY29udGV4dFN0YWNrLmluZGV4T2Yoc2NvcGUpXSA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIHB1c2goc2NvcGUpIHtcbiAgY29udGV4dFN0YWNrLnB1c2goc2NvcGUpO1xufVxuXG5mdW5jdGlvbiBpc09iaih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuZnVuY3Rpb24gdW5kZWYodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgfHwgdmFsdWUgPT09IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlIHx8ICFpc09iaih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gdmFsdWUubWFwKHggPT4gY2xvbmUoeCkpO1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gbmV3IERhdGUodmFsdWUuZ2V0VGltZSgpKTtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gbmV3IFJlZ0V4cCh2YWx1ZS5zb3VyY2UsIHZhbHVlLmZsYWdzKTtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHZhbHVlKS5yZWR1Y2UoKG1lbW8sIGspID0+IE9iamVjdC5hc3NpZ24obWVtbywgeyBba106IGNsb25lKHZhbHVlW2tdKSB9KSwge30pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxzKGEsIGIpIHtcbiAgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikgcmV0dXJuO1xuICBpZiAoYSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKCFlcXVhbHMoYVtpXSwgYltpXSkpIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGEgJiYgYiAmJiBhLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICBjb25zdCB4ID0gT2JqZWN0LmtleXMoYSkuc29ydCgpO1xuICAgIGlmICghZXF1YWxzKHgsIE9iamVjdC5rZXlzKGIpLnNvcnQoKSkpIHJldHVybjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmICghZXF1YWxzKGFbeFtpXV0sIGJbeFtpXV0pKSByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBhID09PSBiO1xufVxuXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKGFyZ3MsIHJlbmRlciwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXM7XG5cbiAgICBzY29wZS5jID0gMDtcblxuICAgIGZ1bmN0aW9uIGVuZChza2lwKSB7XG4gICAgICB0cnkge1xuICAgICAgICBzY29wZS5nZXQuZm9yRWFjaChmeCA9PiB7XG4gICAgICAgICAgaWYgKGZ4Lm9mZiAmJiAhZngub25jZSkge1xuICAgICAgICAgICAgZngub2ZmKCk7XG4gICAgICAgICAgICBmeC5vZmYgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChmeC5vbmNlICYmIGZ4LmNiICYmICFmeC5vZmYpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9IGZ4LmNiKCk7XG5cbiAgICAgICAgICAgIGZ4Lm9uY2UgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmV0dmFsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGZ4Lm9mZiA9IHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2tpcCA9PT0gbnVsbCAmJiBmeC5vbiAmJiBmeC5jYikge1xuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0gZnguY2IoKTtcblxuICAgICAgICAgICAgZngub24gPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmV0dmFsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGZ4Lm9mZiA9IHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2tpcCA9PT0gZmFsc2UgJiYgZngub2ZmKSB7XG4gICAgICAgICAgICBmeC5vZmYoKTtcbiAgICAgICAgICAgIGZ4Lm9mZiA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBkZWZlcnJlZDtcbiAgICBmdW5jdGlvbiBuZXh0KHByb21pc2UpIHtcbiAgICAgIHByb21pc2UuY2F0Y2goZSA9PiB7XG4gICAgICAgIGlmIChzY29wZS5nZXQpIHNldFRpbWVvdXQoKCkgPT4gZW5kKHRydWUpKTtcbiAgICAgICAgaWYgKHNjb3BlLm9uRXJyb3IpIHtcbiAgICAgICAgICBzY29wZS5vbkVycm9yKGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICBkZWZlcnJlZCA9IG51bGw7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZnRlcihjbGVhcikge1xuICAgICAgaWYgKHNjb3BlLmdldCkgbmV4dChQcm9taXNlLnJlc29sdmUoZW5kKGNsZWFyKSkpO1xuICAgIH1cblxuICAgIHNjb3BlLmVxdWFscyA9ICgpID0+IGVxdWFscyhzY29wZS52YWwsIHNjb3BlLm9sZCk7XG5cbiAgICBzY29wZS5kZWZlciA9IG1zID0+IFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAudGhlbigoKSA9PiBuZXcgUHJvbWlzZShvayA9PiBzZXRUaW1lb3V0KCgpID0+IG9rKHNjb3BlKSwgbXMpKSk7XG5cbiAgICBzY29wZS5jbGVhciA9ICgpID0+IHtcbiAgICAgIGlmIChzY29wZS5nZXQpIGFmdGVyKGZhbHNlKTtcbiAgICB9O1xuXG4gICAgc2NvcGUubG9vcCA9ICgpID0+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgc2NvcGUuc2V0ID0gc2NvcGUuc2V0IHx8ICgoKSA9PiBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHNjb3BlLmVxdWFscygpIHx8IHNjb3BlLmxvb3AoKSkpO1xuICAgICAgc2NvcGUub2xkID0gY2xvbmUoc2NvcGUudmFsKTtcbiAgICAgIHNjb3BlLmtleSA9IDA7XG4gICAgICBzY29wZS5meCA9IDA7XG4gICAgICBzY29wZS5tID0gMDtcbiAgICAgIHNjb3BlLmMgKz0gMTtcblxuICAgICAgcHVzaChzY29wZSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHNjb3BlLnJlc3VsdCA9IHJlbmRlciguLi5hcmdzKTtcblxuICAgICAgICBjb25zdCBrZXkgPSBbc2NvcGUua2V5LCBzY29wZS5meCwgc2NvcGUubV0uam9pbignLicpO1xuXG4gICAgICAgIGlmICghc2NvcGUuaGFzaCkge1xuICAgICAgICAgIHNjb3BlLmhhc2ggPSBrZXk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2NvcGUuaGFzaCAhPT0ga2V5KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIb29rcyBtdXN0IGJlIGNhbGxlZCBpbiBhIHByZWRpY3RhYmxlIHdheScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY29wZS5yZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBmYWlsdXJlIGluIGNvbnRleHRcXG4ke2UubWVzc2FnZX1gKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHBvcChzY29wZSk7XG4gICAgICAgIGFmdGVyKG51bGwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQgY29udGV4dCA9IFtdO1xuICAgIHNjb3BlLnN5bmMgPSAoKSA9PiB7XG4gICAgICBkZWZlcnJlZCA9IG5leHQoc2NvcGUuc2V0KHNjb3BlLCAuLi5jb250ZXh0KSk7XG4gICAgICByZXR1cm4gZGVmZXJyZWQ7XG4gICAgfTtcblxuICAgIHNjb3BlLnJ1biA9ICguLi5fYXJncykgPT4ge1xuICAgICAgY29udGV4dCA9IF9hcmdzO1xuICAgICAgc2NvcGUubG9vcCgpO1xuICAgICAgcmV0dXJuIHNjb3BlO1xuICAgIH07XG5cbiAgICBjYWxsYmFjayhzY29wZS5ydW4sIHN5bmMgPT4geyBzY29wZS5zZXQgPSBzeW5jOyB9LCBzY29wZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRleHQocmVuZGVyLCBjYWxsYmFjayA9IGZuID0+IGZuKCkpIHtcbiAgaWYgKHR5cGVvZiByZW5kZXIgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBpbnB1dCBmb3IgY3JlYXRlQ29udGV4dCgpJyk7XG4gIH1cblxuICByZXR1cm4gKC4uLmFyZ3MpID0+IG5ldyBDb250ZXh0KGFyZ3MsIHJlbmRlciwgY2FsbGJhY2spO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb25FcnJvcihjYWxsYmFjaykge1xuICBnZXRDb250ZXh0KCkub25FcnJvciA9IGNhbGxiYWNrO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlTWVtbyhjYWxsYmFjaywgaW5wdXRzKSB7XG4gIGNvbnN0IHNjb3BlID0gZ2V0Q29udGV4dCgpO1xuICBjb25zdCBrZXkgPSBzY29wZS5tO1xuXG4gIHNjb3BlLm0gKz0gMTtcbiAgc2NvcGUudiA9IHNjb3BlLnYgfHwgW107XG4gIHNjb3BlLmQgPSBzY29wZS5kIHx8IFtdO1xuXG4gIGNvbnN0IHByZXYgPSBzY29wZS5kW2tleV07XG5cbiAgaWYgKHVuZGVmKHByZXYpIHx8ICFlcXVhbHMocHJldiwgaW5wdXRzKSkge1xuICAgIHNjb3BlLnZba2V5XSA9IGNhbGxiYWNrKCk7XG4gICAgc2NvcGUuZFtrZXldID0gaW5wdXRzO1xuICB9XG4gIHJldHVybiBzY29wZS52W2tleV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VSZWYocmVzdWx0KSB7XG4gIHJldHVybiB1c2VNZW1vKCgpID0+IHtcbiAgICBsZXQgdmFsdWUgPSBjbG9uZShyZXN1bHQpO1xuXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ2N1cnJlbnQnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIHNldDogcmVmID0+IHsgdmFsdWUgPSByZWY7IH0sXG4gICAgICBnZXQ6ICgpID0+IHZhbHVlLFxuICAgIH0pO1xuICB9LCBbXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VTdGF0ZShmYWxsYmFjaykge1xuICBjb25zdCBzY29wZSA9IGdldENvbnRleHQoKTtcbiAgY29uc3Qga2V5ID0gc2NvcGUua2V5O1xuXG4gIHNjb3BlLmtleSArPSAxO1xuICBzY29wZS52YWwgPSBzY29wZS52YWwgfHwgW107XG5cbiAgaWYgKHVuZGVmKHNjb3BlLnZhbFtrZXldKSkge1xuICAgIHNjb3BlLnZhbFtrZXldID0gZmFsbGJhY2s7XG4gIH1cblxuICByZXR1cm4gW3Njb3BlLnZhbFtrZXldLCB2ID0+IHtcbiAgICBpZiAodHlwZW9mIHYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNjb3BlLnZhbFtrZXldID0gdihzY29wZS52YWxba2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjb3BlLnZhbFtrZXldID0gdjtcbiAgICB9XG4gICAgc2NvcGUuc3luYygpO1xuICAgIHJldHVybiBzY29wZS52YWxba2V5XTtcbiAgfV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VFZmZlY3QoY2FsbGJhY2ssIGlucHV0cykge1xuICBjb25zdCBzY29wZSA9IGdldENvbnRleHQoKTtcbiAgY29uc3Qga2V5ID0gc2NvcGUuZng7XG5cbiAgc2NvcGUuZnggKz0gMTtcbiAgc2NvcGUuaW4gPSBzY29wZS5pbiB8fCBbXTtcbiAgc2NvcGUuZ2V0ID0gc2NvcGUuZ2V0IHx8IFtdO1xuXG4gIGNvbnN0IHByZXYgPSBzY29wZS5pbltrZXldO1xuICBjb25zdCBzY29wZWQgPSAhaW5wdXRzIHx8ICFpbnB1dHMubGVuZ3RoO1xuICBjb25zdCBlbmFibGVkID0gIXNjb3BlZCAmJiAhZXF1YWxzKHByZXYsIGlucHV0cyk7XG5cbiAgc2NvcGUuaW5ba2V5XSA9IGlucHV0cztcbiAgc2NvcGUuZ2V0W2tleV0gPSBzY29wZS5nZXRba2V5XSB8fCB7fTtcblxuICBPYmplY3QuYXNzaWduKHNjb3BlLmdldFtrZXldLCB7IGNiOiBjYWxsYmFjaywgb246IGVuYWJsZWQsIG9uY2U6IHNjb3BlZCB9KTtcbn1cbiIsICJpbXBvcnQgeyBJcyB9IGZyb20gJy4uL3V0aWxzL2NsaWVudC5tanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RyKHZhbHVlKSB7XG4gIGlmICghSXMudmFsdWUodmFsdWUpKSB2YWx1ZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIGlmICghSXMuc3RyKHZhbHVlKSkgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xuICByZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnRzKHZhbHVlKSB7XG4gIHJldHVybiBzdHIodmFsdWUpLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbn1cblxuZXhwb3J0IGNvbnN0IGV4ZWN1dGUgPSAoZWxlbWVudCwgbG9hZGVyLCBuZXh0LCBydW4pID0+IHtcbiAgY29uc3Qgc2VsZiA9IHtcbiAgICAkOiB2YWx1ZSA9PiB7XG4gICAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IGZhbHNlIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiAnJztcbiAgICAgIGlmICh2YWx1ZS5jdXJyZW50KSB2YWx1ZSA9IHZhbHVlLmN1cnJlbnQ7XG4gICAgICBpZiAoIUlzLnNjYWxhcih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIElzLmFycih2YWx1ZSlcbiAgICAgICAgICA/IHZhbHVlLm1hcChzZWxmLiQpLmpvaW4oJycpXG4gICAgICAgICAgOiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIElzLnN0cih2YWx1ZSkgPyBlbnRzKHZhbHVlKSA6IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfSxcbiAgICBkOiB2YWx1ZSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIGNvbnNvbGUuZGVidWcoJ0VfREVCVUcnLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gZW50cyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xuICAgIH0sXG4gICAgcjogdmFsdWUgPT4ge1xuICAgICAgaWYgKElzLmVtcHR5KHZhbHVlKSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIElzLmZ1bmModmFsdWUpID8gdmFsdWUgOiAoKSA9PiB2YWx1ZTtcbiAgICB9LFxuICAgIGU6ICh0YWcsIHByb3BzLCBjaGlsZHJlbikgPT4ge1xuICAgICAgcmV0dXJuIGVsZW1lbnQgPyBlbGVtZW50KHRhZywgcHJvcHMsIGNoaWxkcmVuKSA6IFt0YWcsIHByb3BzLCBjaGlsZHJlbl07XG4gICAgfSxcbiAgICBoOiB2YWx1ZSA9PiB7XG4gICAgICByZXR1cm4gSXMuYXJyKHZhbHVlKSA/IHZhbHVlIDogWydmcmFnbWVudCcsIHsgJ0BodG1sJzogU3RyaW5nKHZhbHVlKSB9XTtcbiAgICB9LFxuICAgIGlmOiAoY29uZCwgdGhlbiwgLi4uYnJhbmNoZXMpID0+IHtcbiAgICAgIGlmIChjb25kKSByZXR1cm4gcnVuKHRoZW4oKSwgW10pO1xuXG4gICAgICBjb25zdCBmYWxsYmFjayA9IGJyYW5jaGVzLnBvcCgpO1xuXG4gICAgICBsZXQgb3RoZXJ3aXNlO1xuICAgICAgZm9yIChjb25zdCBibG9jayBvZiBicmFuY2hlcykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBibG9jayAmJiBibG9jaygpO1xuXG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBvdGhlcndpc2UgPSByZXN1bHQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJ1bihvdGhlcndpc2UgfHwgKGZhbGxiYWNrICYmIGZhbGxiYWNrKCkpLCBbXSk7XG4gICAgfSxcbiAgICBtYXA6IChzdWJqLCBib2R5LCBmYWxsYmFjaykgPT4ge1xuICAgICAgZnVuY3Rpb24gaXQoXywgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBydW4oYm9keSwgW18sIG9mZnNldF0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoSXMucGxhaW4oc3ViaikpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBPYmplY3QuZW50cmllcyhzdWJqKTtcblxuICAgICAgICByZXR1cm4gaXRlbXMubGVuZ3RoXG4gICAgICAgICAgPyBydW4oaXRlbXMubWFwKChbaywgdl0pID0+IGl0KHYsIGspKSwgW10pXG4gICAgICAgICAgOiBydW4oZmFsbGJhY2sgJiYgZmFsbGJhY2soKSwgW10pO1xuICAgICAgfVxuXG4gICAgICBsZXQgaW5wdXQgPSBbXTtcbiAgICAgIGlmIChzdWJqPy5jdXJyZW50KSBzdWJqID0gc3Viai5jdXJyZW50O1xuICAgICAgaWYgKElzLml0ZXJhYmxlKHN1YmopIHx8IElzLmFycihzdWJqKSkgaW5wdXQgPSBbLi4uc3Vial07XG4gICAgICBlbHNlIGlmIChJcy5udW0oc3ViaikpIGlucHV0ID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogc3ViaiB9KS5tYXAoKF8sIGkpID0+IGkpO1xuXG4gICAgICByZXR1cm4gaW5wdXQubGVuZ3RoXG4gICAgICAgID8gcnVuKGlucHV0Lm1hcChpdCksIFtdKVxuICAgICAgICA6IHJ1bihmYWxsYmFjayAmJiBmYWxsYmFjaygpLCBbXSk7XG4gICAgfSxcbiAgICBibG9jazogKHRwbCwgbmFtZSwgcHJvcHMsIF9jaGlsZHJlbikgPT4ge1xuICAgICAgaWYgKCF0cGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyAnJHtuYW1lfScgY29tcG9uZW50YCk7XG4gICAgICBpZiAoX2NoaWxkcmVuKSBwcm9wcy5jaGlsZHJlbiA9ICgpID0+IF9jaGlsZHJlbjtcblxuICAgICAgcmV0dXJuIHJ1bihuZXh0KHRwbCwgcHJvcHMsIGxvYWRlciwgc2VsZiksIFtdKTtcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiAodHBsLCBwcm9wcywgbGFiZWwgPSAndW5rbm93bicpID0+IHtcbiAgICBpZiAoIXRwbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCB0ZW1wbGF0ZSAoJHtsYWJlbH0pYCk7XG4gICAgfVxuICAgIHJldHVybiBydW4odHBsKHNlbGYsIHByb3BzKSwgW10pO1xuICB9O1xufTtcbiIsICJpbXBvcnQgeyBJcyB9IGZyb20gJy4uL3V0aWxzL2NsaWVudC5tanMnO1xuLy8gaW1wb3J0IHsgUmVmIH0gZnJvbSAnLi4vbWFya3VwL2V4cHIubWpzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuL2hvb2tzLm1qcyc7XG5cbi8vIGNvbnN0IFJFRl9DSFVOSyA9IFN5bWJvbCgnQEByZWYnKTtcblxuLy8gZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVSZWN1cnNpdmVseShvdXQpIHtcbi8vICAgd2hpbGUgKG91dC5sZW5ndGggPT09IDEgJiYgSXMuYXJyKG91dFswXSkpIG91dCA9IG91dFswXTtcbi8vXG4vLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgb3V0W2ldID0gSXMuYXJyKG91dFtpXSkgPyByZXNvbHZlUmVjdXJzaXZlbHkob3V0W2ldKSA6IG91dFtpXTtcbi8vICAgfVxuLy8gICByZXR1cm4gUHJvbWlzZS5hbGwob3V0KTtcbi8vIH1cbi8vXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY0FzeW5jKGNodW5rLCBjdHgsIF8pIHtcbiAgbGV0IHJlc3VsdCA9IGF3YWl0IGNodW5rO1xuICAvLyBGSVhNRTogd2hhdCBhYm91dCB0aGVzZT9cbiAgLy8gaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFJlZikge1xuICAvLyAgcmVzdWx0ID0gYXdhaXQgXy5jaHVua3MuZ2V0KHJlc3VsdC4ka2V5KTtcbiAgLy8gfVxuICAvL1xuXG4gIGlmIChJcy5mdW5jKHJlc3VsdCkgJiYgIXJlc3VsdC5uYW1lKSB7XG4gICAgcmVzdWx0ID0gYXdhaXQgcmVzdWx0LmFwcGx5KHVuZGVmaW5lZCwgY3R4KTtcbiAgfVxuXG4gIGlmIChJcy5hcnIocmVzdWx0KSAvKiAmJiAhcmVzdWx0W1JFRl9DSFVOS10gKi8pIHtcbiAgICByZXN1bHQgPSBhd2FpdCBQcm9taXNlLmFsbChyZXN1bHQubWFwKGl0ZW0gPT4gZXhlY0FzeW5jKGl0ZW0sIGN0eCwgXykpKTtcbiAgICAvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVzdWx0LCBSRUZfQ0hVTkssIHsgdmFsdWU6IDEsIGVudW1lcmFibGU6IGZhbHNlIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGNvbnN0IGV4ZWN1dGVBc3luYyA9ICh0YWcsIGxvYWRlciwgY2FsbGJhY2spID0+IGV4ZWN1dGUodGFnLCBsb2FkZXIsIGNhbGxiYWNrLCBleGVjQXN5bmMpO1xuIiwgImltcG9ydCB7IGV4ZWN1dGVBc3luYyB9IGZyb20gJy4uL3JlbmRlci9hc3luYy5tanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JhcENvbXBvbmVudChfLCBsb29wKSB7XG4gIHJldHVybiB0aGlzLmNyZWF0ZUNvbnRleHQobG9vcCwgKHN5bmMsIHVwZGF0ZSkgPT4ge1xuICAgIGxldCBkZWZlcnJlZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIHVwZGF0ZShzZWxmID0+IHtcbiAgICAgIGlmICghc2VsZi5lcXVhbHMoKSkge1xuICAgICAgICBkZWZlcnJlZCA9IGRlZmVycmVkXG4gICAgICAgICAgLnRoZW4oKCkgPT4gc2VsZi5sb29wKCkpXG4gICAgICAgICAgLnRoZW4oZGF0YSA9PiBzZWxmLnBhdGNoKGRhdGEpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZlcnJlZDtcbiAgICB9KTtcbiAgICByZXR1cm4gc3luYygpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsaWVudENvbXBvbmVudChtb2QsIGNvbnRleHQsIGZpbGVwYXRoKSB7XG4gIGlmICghbW9kKSB7XG4gICAgY29uc29sZS5sb2coJ0VfTU9EJywgeyBjb250ZXh0LCBmaWxlcGF0aCB9KTtcbiAgICByZXR1cm4geyBtb3VudDogZWwgPT4gZWwgfTtcbiAgfVxuXG4gIGNvbnN0IGxvYWRlciA9IHggPT4gKHggPT09ICdqYW1yb2NrJyA/IHRoaXMgOiBjb250ZXh0LmxvYWRlcj8uKHgpIHx8IGltcG9ydCh4KSk7XG4gIGNvbnN0IHJlbmRlciA9IGV4ZWN1dGVBc3luYyhudWxsLCBsb2FkZXIsIGFzeW5jIChjaGlsZCwgcHJvcHMpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZygnUkVOREVSPycsIGNoaWxkLCBwcm9wcyk7XG4gICAgaWYgKCFjaGlsZCkge1xuICAgICAgY29uc29sZS5sb2coJ0VfQ0hJTEQnLCBwcm9wcywgY2hpbGQpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBkYXRhID0gcHJvcHM7XG4gICAgaWYgKGNoaWxkLl9faGFuZGxlcikge1xuICAgICAgY29uc29sZS5sb2coJ0NISUxEJywgY2hpbGQpO1xuICAgICAgLy8gY29uc3QgdHBsID0gYXdhaXQgY2hpbGQuX19oYW5kbGVyKGRhdGEsIGxvYWRlcik7XG4gICAgICAvLyBjb25zdCBzZWxmID0gYXdhaXQgdHBsLl9fc2VsZigpO1xuICAgICAgLy8gZGF0YSA9IGF3YWl0IHNlbGYucmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gcmVuZGVyKGNoaWxkLl9fdGVtcGxhdGUsIGRhdGEsIGNoaWxkLl9fc3JjKTtcbiAgfSk7XG4gIGNvbnN0IG5leHQgPSBkYXRhID0+IHJlbmRlcihtb2QuX190ZW1wbGF0ZSwgZGF0YSwgbW9kLl9fc3JjKTtcbiAgY29uc3QgbW91bnQgPSBhc3luYyAoZWwsIHByb3BzLCBfZXZlbnRzKSA9PiB7XG4gICAgaWYgKGVsLl9fc3RhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50IGFscmVhZHkgbW91bnRlZCcpO1xuICAgIH1cblxuICAgIGxldCB2bm9kZTtcbiAgICBpZiAobW9kLl9faGFuZGxlcikge1xuICAgICAgY29uc3QgbWFpbiA9IGF3YWl0IG1vZC5fX2hhbmRsZXIoeyAuLi5wcm9wcyB9LCBsb2FkZXIsIGVsKTtcbiAgICAgIGNvbnN0IHN0b3JlID0gYXdhaXQgbWFpbi5fX3NlbGYoKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBzdG9yZS5sb29wKCk7XG5cbiAgICAgIHN0b3JlLnBhdGNoID0gYXN5bmMgcGVlayA9PiB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZWwuX19zdGF0ZSwgcGVlay5fX3Njb3BlKTtcbiAgICAgICAgY29uc3QgcGF0Y2ggPSBhd2FpdCBuZXh0KGVsLl9fc3RhdGUpO1xuICAgICAgICBlbC5jdXJyZW50ID0gcGVlay5fX2RlZmF1bHQ7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJldHVybi1hc3NpZ25cbiAgICAgICAgcmV0dXJuIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgID8gdGhpcy5wYXRjaE5vZGUoZWwsIHZub2RlLCB2bm9kZSA9IHBhdGNoKVxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXR1cm4tYXNzaWduXG4gICAgICAgICAgOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5wYXRjaE5vZGUoZWwsIHZub2RlLCB2bm9kZSA9IHBhdGNoKSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoZWwuX19zdG9yZSkgZWwuX19zdG9yZS5jbGVhcigpO1xuICAgICAgZWwuY3VycmVudCA9IGRhdGEuX19kZWZhdWx0O1xuICAgICAgZWwuX19zdGF0ZSA9IHsgLi4ucHJvcHMsIC4uLmRhdGEuX19zY29wZSB9O1xuICAgICAgZWwuX19zdG9yZSA9IHN0b3JlO1xuICAgIH1cblxuICAgIGVsLl9fZGVmZXIgPSBlbC5fX2RlZmVyIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGVsLl9fdXBkYXRlID0gKF9tb2QsIF9wcm9wcykgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1tVUERBVEVdJywgX3Byb3BzKTtcbiAgICAgIGlmIChlbC5fX3N0b3JlKSBlbC5fX3N0b3JlLmNsZWFyKCk7XG4gICAgICBlbC5fX3N0YXRlID0gbnVsbDtcbiAgICAgIGVsLl9fZGVmZXIgPSBlbC5fX2RlZmVyXG4gICAgICAgIC50aGVuKCgpID0+IGNsaWVudENvbXBvbmVudC5jYWxsKHRoaXMsIF9tb2QsIGNvbnRleHQpLm1vdW50KGVsLCBfcHJvcHMpKTtcbiAgICB9O1xuXG4gICAgLy8gY29uc29sZS5sb2coJ1tSRU5ERVJdJywgcHJvcHMsIGVsLl9fc3RhdGUpO1xuICAgIHZub2RlID0gYXdhaXQgbmV4dChlbC5fX3N0YXRlKTtcblxuICAgIGlmIChjb250ZXh0Py5zeW5jKSB7XG4gICAgICBjb250ZXh0LnN5bmModm5vZGUsIF9ldmVudHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlclRvRWxlbWVudChlbCwgdm5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG4gIH07XG4gIHJldHVybiB7IG1vdW50IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3VudGFibGVDb21wb25lbnQobW9kLCBjb250ZXh0LCBmaWxlcGF0aCkge1xuICByZXR1cm4gY2xpZW50Q29tcG9uZW50LmNhbGwodGhpcywgbW9kLCBjb250ZXh0LCBmaWxlcGF0aCk7XG59XG4iLCAiaW1wb3J0IHsgb25FcnJvciwgdXNlUmVmLCB1c2VNZW1vLCB1c2VTdGF0ZSwgdXNlRWZmZWN0LCBjcmVhdGVDb250ZXh0IH0gZnJvbSAnbm9ob29rcyc7XG5cbmltcG9ydCB7IHdyYXBDb21wb25lbnQsIG1vdW50YWJsZUNvbXBvbmVudCB9IGZyb20gJy4vcmVuZGVyLm1qcyc7XG5pbXBvcnQgeyBJcywgc2xlZXAgfSBmcm9tICcuLi91dGlscy9jbGllbnQubWpzJztcbmltcG9ydCB7IGZsYXR0ZW4gfSBmcm9tICcuLi91dGlscy9zaGFyZWQubWpzJztcblxuY29uc3QgSEFTX0lOVEVSX09CU0VSVkVSUyA9ICdJbnRlcnNlY3Rpb25PYnNlcnZlcicgaW4gd2luZG93O1xuY29uc3QgSEFTX1JFUVVFU1RfSURMRSA9ICdyZXF1ZXN0SWRsZUNhbGxiYWNrJyBpbiB3aW5kb3c7XG5jb25zdCBIQVNfTUFUQ0hfTUVESUEgPSAnbWF0Y2hNZWRpYScgaW4gd2luZG93O1xuY29uc3QgSEFTX0NPTk5FQ1RJT04gPSAnY29ubmVjdGlvbicgaW4gbmF2aWdhdG9yO1xuY29uc3QgREVGQVVMVF9FVkVOVFMgPSBbJ2NsaWNrJywgJ2ZvY3VzaW4nLCAndG91Y2hzdGFydCddO1xuY29uc3QgQ09ORElUSU9OU19NQVAgPSBbJ2lkbGUnLCAndmlzaWJsZScsICdtZWRpYScsICdzYXZlZGF0YScsICdpbnRlcmFjdGlvbiddO1xuXG5leHBvcnQgY2xhc3MgQ29uZGl0aW9ucyB7XG4gIHN0YXRpYyBpcyhub2RlKSB7XG4gICAgcmV0dXJuIChub2RlLmRhdGFzZXQgJiYgKFxuICAgICAgJ2NvbXBvbmVudCcgaW4gbm9kZS5kYXRhc2V0XG4gICAgICB8fCAnZW5oYW5jZScgaW4gbm9kZS5kYXRhc2V0XG4gICAgICB8fCAncmVzZXQnIGluIG5vZGUuZGF0YXNldFxuICAgICAgfHwgJ3VzZScgaW4gbm9kZS5kYXRhc2V0XG4gICAgKSkgfHwgSXMuZnVuYyhub2RlLl9fZGVzdHJveSk7XG4gIH1cblxuICBzdGF0aWMgaGFzKG5vZGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgZm9yIChjb25zdCBrZXkgaW4gbm9kZS5kYXRhc2V0KSB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YoJ3VzZTonKSA9PT0gMCB8fCBrZXkuaW5kZXhPZignaXM6JykgPT09IDApIHJldHVybiB0cnVlO1xuICAgICAgaWYgKGtleS5pbmRleE9mKCdvbjonKSA9PT0gMCAmJiBDT05ESVRJT05TX01BUC5pbmNsdWRlcyhrZXkuc3Vic3RyKDMpKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldChub2RlKSB7XG4gICAgY29uc3QgaG9va3MgPSBbXTtcblxuICAgIE9iamVjdC5rZXlzKG5vZGUuZGF0YXNldCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGtleS5pbmRleE9mKCdpczonKSA9PT0gMCkgaG9va3MucHVzaChbJ3Jlc2V0JywgeyBhdHRyOiBrZXkuc3Vic3RyKDMpIH1dKTtcbiAgICAgIGlmIChrZXkuaW5kZXhPZigndXNlOicpID09PSAwKSBob29rcy5wdXNoKFsnaG9vaycsIHsgbmFtZToga2V5LnN1YnN0cig0KSwgc291cmNlOiBub2RlLmRhdGFzZXRba2V5XSB9XSk7XG4gICAgICBpZiAoa2V5LmluZGV4T2YoJ29uOicpID09PSAwICYmIENPTkRJVElPTlNfTUFQLmluY2x1ZGVzKGtleS5zdWJzdHIoMykpKSBob29rcy5wdXNoKFtrZXkuc3Vic3RyKDMpLCBub2RlLmRhdGFzZXRba2V5XV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBob29rcztcbiAgfVxuXG4gIHN0YXRpYyBtYXAobm9kZSkge1xuICAgIHJldHVybiBDb25kaXRpb25zLmdldChub2RlKS5yZWR1Y2UoKG1lbW8sIFtrLCB2XSkgPT4ge1xuICAgICAgbWVtby5wdXNoKENvbmRpdGlvbnNba10obm9kZSwgdiA9PT0gJ3RydWUnID8gJycgOiB2KSk7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9LCBbXSk7XG4gIH1cblxuICBzdGF0aWMgaG9vayhub2RlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHsgbm9kZSwgcGFyYW1zIH0pO1xuICB9XG5cbiAgc3RhdGljIHJlc2V0KG5vZGUsIHBhcmFtcykge1xuICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKHBhcmFtcy5hdHRyKTtcbiAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1yZXNldCcpO1xuICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGBkYXRhLWlzOiR7cGFyYW1zLmF0dHJ9YCk7XG4gIH1cblxuICBzdGF0aWMgaWRsZShfLCByZWFkeSkge1xuICAgIGNvbnN0IG9ubG9hZCA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT09ICdjb21wbGV0ZScpIHtcbiAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHJlc29sdmUoKSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlYWR5ICE9PSBmYWxzZSAmJiBIQVNfUkVRVUVTVF9JRExFXG4gICAgICA/IFByb21pc2UuYWxsKFtuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlcXVlc3RJZGxlQ2FsbGJhY2socmVzb2x2ZSkpLCBvbmxvYWRdKVxuICAgICAgOiBvbmxvYWQ7XG4gIH1cblxuICBzdGF0aWMgcmVhZHkoKSB7XG4gICAgcmV0dXJuIENvbmRpdGlvbnMuaWRsZShudWxsLCBmYWxzZSk7XG4gIH1cblxuICBzdGF0aWMgbWVkaWEoXywgcXVlcnkpIHtcbiAgICBsZXQgcSA9IHsgbWF0Y2hlczogdHJ1ZSB9O1xuICAgIGlmIChxdWVyeSAmJiBIQVNfTUFUQ0hfTUVESUEpIHtcbiAgICAgIHEgPSB3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSk7XG4gICAgfVxuXG4gICAgaWYgKCFxLm1hdGNoZXMpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgcS5hZGRMaXN0ZW5lcihlID0+IGUubWF0Y2hlcyAmJiByZXNvbHZlKCkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHZpc2libGUoZWwpIHtcbiAgICBpZiAoSEFTX0lOVEVSX09CU0VSVkVSUykge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoW2VudHJ5XSkgPT4ge1xuICAgICAgICAgIGlmIChlbnRyeS5pc0ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgb2JzZXJ2ZXIudW5vYnNlcnZlKGVudHJ5LnRhcmdldCk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGVsKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBzYXZlZGF0YShfLCBleHBlY3RzKSB7XG4gICAgcmV0dXJuICghSEFTX0NPTk5FQ1RJT04gfHwgbmF2aWdhdG9yLmNvbm5lY3Rpb24uc2F2ZURhdGEgPT09IChleHBlY3RzICE9PSAnZmFsc2UnKSkgfHwgc2xlZXAoKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnRlcmFjdGlvbihlbCwgb3ZlcnJpZGVzKSB7XG4gICAgbGV0IGV2ZW50cyA9IERFRkFVTFRfRVZFTlRTO1xuICAgIGlmIChvdmVycmlkZXMpIHtcbiAgICAgIGV2ZW50cyA9IChvdmVycmlkZXMgfHwgJycpLnNwbGl0KC9bLHxdLykubWFwKGVudHJ5ID0+IGVudHJ5LnRyaW0oKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgZnVuY3Rpb24gbmV4dChldmVudCwgY2IpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGV2ZW50cykgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBjYik7XG4gICAgICAgIHJlc29sdmUoZXZlbnQpO1xuICAgICAgfVxuXG4gICAgICBsZXQgdDtcbiAgICAgIGZ1bmN0aW9uIHNraXAoZSwgY2IpIHtcbiAgICAgICAgY29uc3QgZXYgPSB7IHg6IGUueCwgeTogZS55LCB0YWc6IGUudGFyZ2V0LnRhZ05hbWUsIHR5cGU6IGUudHlwZSB9O1xuXG4gICAgICAgIGlmIChlLnR5cGUgPT09ICdjbGljaycpIHJldHVybiBuZXh0KGV2LCBjYik7XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgICAgICB0ID0gc2V0VGltZW91dCgoKSA9PiBuZXh0KGV2LCBjYiksIDE1MCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uRXZlbnQoZSkge1xuICAgICAgICBpZiAoZXZlbnRzLmluY2x1ZGVzKGUudHlwZSkpIHNraXAoZSwgb25FdmVudCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBldmVudHMpIHtcbiAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvbkV2ZW50LCB7IG9uY2U6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbXBvbmVudHMge1xuICBjb25zdHJ1Y3Rvcihicm93c2VyLCBwcmVmaXgsIHsgX19kZWZhdWx0cywgX19zY3JpcHRzLCBfX2NhbGxzIH0pIHtcbiAgICB0aGlzLmhlYWRsZXNzID0gYnJvd3Nlci5oZWFkbGVzcztcbiAgICB0aGlzLmJyb3dzZXIgPSBicm93c2VyO1xuICAgIHRoaXMucHJlZml4ID0gcHJlZml4O1xuICAgIHRoaXMuY2FsbHMgPSBfX2NhbGxzIHx8IHt9O1xuICAgIHRoaXMuc2NyaXB0cyA9IF9fc2NyaXB0cyB8fCB7fTtcbiAgICB0aGlzLmRlZmF1bHRzID0gX19kZWZhdWx0cyB8fCB7fTtcblxuICAgIHRoaXMub2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ID0+IHtcbiAgICAgIGZvciAoY29uc3QgbXV0YXRpb24gb2YgbGlzdCkge1xuICAgICAgICBjb25zdCB7IGFkZGVkTm9kZXMsIHJlbW92ZWROb2RlcywgdGFyZ2V0IH0gPSBtdXRhdGlvbjtcblxuICAgICAgICBhZGRlZE5vZGVzLmZvckVhY2gobm9kZSA9PiBDb25kaXRpb25zLmlzKG5vZGUpICYmIHRoaXMuYXBwZW5kKG5vZGUpKTtcbiAgICAgICAgcmVtb3ZlZE5vZGVzLmZvckVhY2gobm9kZSA9PiBDb25kaXRpb25zLmlzKG5vZGUpICYmIHRoaXMuZGVsZXRlKG5vZGUpKTtcblxuICAgICAgICBpZiAoIXRoaXMuZWxlbWVudHMuaGFzKHRhcmdldCkgJiYgQ29uZGl0aW9ucy5pcyh0YXJnZXQpKSB0aGlzLmFwcGVuZCh0YXJnZXQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkZWQgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5tb2R1bGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuaW1wb3J0cyA9IFtdO1xuICAgIHRoaXMub24oKTtcbiAgfVxuXG4gIHJlYmFzZSh1cmwsIHJlbG9hZCkge1xuICAgIGNvbnN0IHEgPSByZWxvYWQgfHwgdGhpcy5tb2R1bGVzLmhhcyh1cmwpID8gYD9fPSR7RGF0ZS5ub3coKX1gIDogJyc7XG4gICAgY29uc3QgcGF0aCA9IGAvJHt0aGlzLnByZWZpeH0vJHt1cmx9JHtxfWA7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICBhc3luYyByZXNvbHZlKGtleSkge1xuICAgIGF3YWl0IHRoaXMuaW1wb3J0KGtleSk7XG4gICAgcmV0dXJuIHRoaXMubG9hZGVkLmdldChrZXkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0KHVybCwgcmVsb2FkKSB7XG4gICAgY29uc29sZS5sb2coJ1tFU01dJywgdXJsKTtcblxuICAgIGNvbnN0IHBhdGggPSB0aGlzLnJlYmFzZSh1cmwsIHJlbG9hZCk7XG5cbiAgICBpZiAoIXRoaXMuaW1wb3J0c1twYXRoXSkge1xuICAgICAgY29uc3Qgc3JjID0gcGF0aC5yZXBsYWNlKC9cXC4oPzptZHxodG1sKSg/OlxcL1xcZCspPy8sICcuYnVuZGxlZC5tanMnKTtcblxuICAgICAgdGhpcy5pbXBvcnRzW3BhdGhdID0gRGF0ZS5ub3coKTtcbiAgICAgIGxldCBtb2QgPSBhd2FpdCBpbXBvcnQoc3JjKTtcbiAgICAgIG1vZCA9IG1vZC5kZWZhdWx0IHx8IG1vZDtcbiAgICAgIHRoaXMubW9kdWxlcy5zZXQodXJsLCBtb2QpO1xuICAgICAgaWYgKHVybC5pbmNsdWRlcygnLm1kJykgfHwgdXJsLmluY2x1ZGVzKCcuaHRtbCcpKSB7XG4gICAgICAgIGNvbnN0IG9sZCA9IHRoaXMubG9hZGVkLmdldCh1cmwpO1xuICAgICAgICB0aGlzLmRlZmF1bHRzW3VybF0gPSB7IC4uLm1vZC5fX2RhdGEsIC4uLnRoaXMuZGVmYXVsdHNbdXJsXSB9O1xuICAgICAgICB0aGlzLmxvYWRlZC5zZXQodXJsLCB7IC4uLm9sZCwgLi4ubW9kLCBfX2RhdGE6IHRoaXMuZGVmYXVsdHNbdXJsXSB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm1vZHVsZXMuaGFzKHVybCkpIHtcbiAgICAgIHJldHVybiBzbGVlcCgpLnRoZW4oKCkgPT4gdGhpcy5pbXBvcnQodXJsKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZXMuZ2V0KHVybCk7XG4gIH1cblxuICBhc3luYyBsb2FkKG5vZGUsIGV2ZW50cykge1xuICAgIG5vZGUuX19wZW5kaW5nID0gbnVsbDtcblxuICAgIGlmIChub2RlLmRhdGFzZXQuY29tcG9uZW50KSB7XG4gICAgICBjb25zdCBba2V5XSA9IG5vZGUuZGF0YXNldC5jb21wb25lbnQuc3BsaXQoJzonKTtcbiAgICAgIGNvbnN0IHNyYyA9IGtleS5yZXBsYWNlKC9cXC9cXGQrJC8sICcnKTtcbiAgICAgIGNvbnN0IG1vZCA9IGF3YWl0IHRoaXMucmVzb2x2ZShrZXkpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAobm9kZS5fX3VwZGF0ZSkge1xuICAgICAgICAgIGF3YWl0IG5vZGUuX191cGRhdGUobW9kLCBtb2QuX19kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmF0dGFjaChtb2QsIG5vZGUsIG1vZC5fX2RhdGEsIHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMuaG9va3Mobm9kZSwgZXZlbnRzKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihlLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoJ2VuaGFuY2UnIGluIG5vZGUuZGF0YXNldCkge1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMuaG9va3Mobm9kZSwgZXZlbnRzKSk7XG4gICAgfSBlbHNlIGlmICgndXNlJyBpbiBub2RlLmRhdGFzZXQpIHtcbiAgICAgIHRoaXMucmVmKG5vZGUsIG5vZGUuZGF0YXNldC51c2UpO1xuICAgIH1cbiAgfVxuXG4gIG9uKCkge1xuICAgIHRoaXMuZWxlbWVudHMgPSBuZXcgU2V0KFsuLi5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jb21wb25lbnRdLFtkYXRhLWVuaGFuY2VdLFtkYXRhLXJlc2V0XSxbZGF0YS11c2VdJyldKTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiBDb25kaXRpb25zLmlzKG5vZGUpICYmIHRoaXMuYXBwZW5kKG5vZGUpKSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMuYnJvd3Nlci5zY3JpcHRzKHRoaXMuc2NyaXB0cykpO1xuXG4gICAgdGhpcy5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xuICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgfSk7XG4gIH1cblxuICBvZmYoKSB7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHRoaXMuZGVsZXRlKG5vZGUpKTtcbiAgfVxuXG4gIHNldChkZWZhdWx0cywgY2FsbHMsIHNjcmlwdHMsIGZyYWdtZW50cykge1xuICAgIGNvbnNvbGUubG9nKCdbRlJBR01FTlRTXScsIGZyYWdtZW50cyk7XG4gICAgaWYgKGNhbGxzKSBPYmplY3QuYXNzaWduKHRoaXMuY2FsbHMsIGNhbGxzKTtcbiAgICBpZiAoc2NyaXB0cykgT2JqZWN0LmFzc2lnbih0aGlzLnNjcmlwdHMsIHNjcmlwdHMpO1xuICAgIGlmIChkZWZhdWx0cykgT2JqZWN0LmFzc2lnbih0aGlzLmRlZmF1bHRzLCBkZWZhdWx0cyk7XG4gIH1cblxuICByZWYobm9kZSwgc2NyaXB0KSB7XG4gICAgdGhpcy5pbXBvcnQoc2NyaXB0KS50aGVuKGhvb2sgPT4ge1xuICAgICAgaWYgKGhvb2suX19leGVjdXRlKSByZXR1cm4gaG9vay5fX2V4ZWN1dGUobm9kZSk7XG4gICAgfSk7XG4gIH1cblxuICBob29rcyhub2RlLCBldmVudHMpIHtcbiAgICBpZiAobm9kZS5fX2hvb2tzKSB7XG4gICAgICBub2RlLl9faG9va3MuZm9yRWFjaChmbiA9PiBmbigpKTtcbiAgICB9XG5cbiAgICBub2RlLl9faG9va3MgPSBbXTtcblxuICAgIHJldHVybiBQcm9taXNlLmFsbChldmVudHMucmVkdWNlKChtZW1vLCBldikgPT4ge1xuICAgICAgaWYgKGV2Py50eXBlID09PSAnY2xpY2snKSB7XG4gICAgICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChldi54LCBldi55KTtcbiAgICAgICAgaWYgKGVsLnRhZ05hbWUgPT09IGV2LnRhZykgZWwuY2xpY2soKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2Py5ub2RlKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGV2LnBhcmFtcy5zb3VyY2U7XG4gICAgICAgIGNvbnN0IHNyYyA9IGtleS5yZXBsYWNlKC9cXC4oPzptZHxodG1sKSg/OlxcL1xcZCspPyQvLCAnLmhvb2tzLm1qcycpO1xuXG4gICAgICAgIG1lbW8ucHVzaCh0aGlzLmltcG9ydChzcmMpXG4gICAgICAgICAgLnRoZW4obW9kID0+IHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdbSE9PS10nLCBldi5ub2RlLCBldi5wYXJhbXMpO1xuICAgICAgICAgICAgY29uc3Qgb2ZmID0gbW9kW2V2LnBhcmFtcy5uYW1lXShub2RlKTtcbiAgICAgICAgICAgIGlmIChJcy5mdW5jKG9mZikpIG5vZGUuX19ob29rcy5wdXNoKG9mZik7XG4gICAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9LCBbXSkpO1xuICB9XG5cbiAgcmVsb2FkKHNvdXJjZSkge1xuICAgIGNvbnNvbGUubG9nKCdbSE1SXScsIHNvdXJjZSk7XG4gICAgdGhpcy5tb2R1bGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuaW1wb3J0cyA9IFtdO1xuICB9XG5cbiAgcmVmZXRjaCgpIHtcbiAgICBjb25zb2xlLmxvZygnW1JFRkVUQ0hdJyk7XG4gICAgdGhpcy5yZWxvYWQoKTtcbiAgfVxuXG4gIGF0dGFjaChtb2QsIG5vZGUsIHN0YXRlLCBmaWxlcGF0aCkge1xuICAgIGlmICghKHdpbmRvdy5KYW1yb2NrLlJ1bnRpbWUgJiYgd2luZG93LkphbXJvY2suUnVudGltZS5tb3VudGFibGVDb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gc2xlZXAoKS50aGVuKCgpID0+IHRoaXMuYXR0YWNoKG1vZCwgbm9kZSwgc3RhdGUsIGZpbGVwYXRoKSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcG9uZW50ID0gd2luZG93LkphbXJvY2suUnVudGltZS5tb3VudGFibGVDb21wb25lbnQobW9kLCB7XG4gICAgICBzeW5jOiB2ZG9tID0+IHRoaXMuYnJvd3Nlci5wYXRjaChub2RlLCB2ZG9tKSxcbiAgICB9LCBmaWxlcGF0aCk7XG5cbiAgICByZXR1cm4gY29tcG9uZW50Lm1vdW50KG5vZGUsIHN0YXRlKTtcbiAgfVxuXG4gIGFwcGVuZChub2RlKSB7XG4gICAgaWYgKCF0aGlzLmxvYWRlZCkge1xuICAgICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xuICAgICAgdGhpcy5icm93c2VyLnJ1bnRpbWUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih3aW5kb3cuSmFtcm9jay5SdW50aW1lLCB7XG4gICAgICAgICAgb25FcnJvciwgdXNlUmVmLCB1c2VNZW1vLCB1c2VTdGF0ZSwgdXNlRWZmZWN0LCBjcmVhdGVDb250ZXh0LCB3cmFwQ29tcG9uZW50LCBtb3VudGFibGVDb21wb25lbnQsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50cy5hZGQobm9kZSk7XG4gICAgdGhpcy5yZWZyZXNoKG5vZGUpO1xuICB9XG5cbiAgcmVmcmVzaChub2RlKSB7XG4gICAgaWYgKG5vZGUuX19wZW5kaW5nKSByZXR1cm47XG4gICAgbm9kZS5fX3BlbmRpbmcgPSB0cnVlO1xuXG4gICAgaWYgKCFDb25kaXRpb25zLmhhcyhub2RlKSkge1xuICAgICAgQ29uZGl0aW9ucy5yZWFkeSgpLnRoZW4oKCkgPT4gdGhpcy5sb2FkKG5vZGUsIFtdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFByb21pc2UuYWxsKENvbmRpdGlvbnMubWFwKG5vZGUpKS50aGVuKCguLi5zZXQpID0+IHRoaXMubG9hZChub2RlLCBmbGF0dGVuKHNldCkpKTtcbiAgICB9XG4gIH1cblxuICBkZWxldGUobm9kZSkge1xuICAgIG5vZGUuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3RlYXJkb3duJykpO1xuXG4gICAgdGhpcy5lbGVtZW50cy5kZWxldGUobm9kZSk7XG5cbiAgICBpZiAobm9kZS5fX2hvb2tzKSB7XG4gICAgICBub2RlLl9faG9va3MuZm9yRWFjaChmbiA9PiBmbigpKTtcbiAgICAgIG5vZGUuX19ob29rcyA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKG5vZGUuX19zdG9yZSkge1xuICAgICAgbm9kZS5fX3N0b3JlLmNsZWFyKCk7XG4gICAgICBub2RlLl9fc3RvcmUgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHRoaXMuZGVsZXRlKG5vZGUpKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7OztBQUFBLElBQU0sZUFBZSxDQUFDO0FBRWYsU0FBUyxhQUFhO0FBQzNCLFFBQU0sUUFBUSxhQUFhLGFBQWEsU0FBUyxDQUFD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
