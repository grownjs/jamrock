import {
  Nr,
  Tr,
  decode,
  findNodes,
  spaNavigate,
  updatePage
} from "./chunk-S3BAYXEE.js";

// src/client/livesocket.mjs
var protocol = location.protocol === "http:" ? "ws" : "wss";
var LiveSocket = class {
  constructor(browser) {
    Object.defineProperty(this, "uuid", {
      get: () => browser.request_uuid
    });
    this.ready = false;
    this.browser = browser;
    this.headless = browser.headless;
    this.document = document.documentElement.dataset.location;
    this.location = location.pathname.split(this.uuid)[1] || location.pathname;
    console.debug("connect", this.uuid, this.location);
    let interval = 100;
    function timeout(msg) {
      console.debug("RETRY", msg, interval);
      const ms = interval;
      interval *= 2;
      return ms;
    }
    function throttle(callback, time) {
      if (callback.t) return;
      callback.t = true;
      setTimeout(() => {
        callback();
        callback.t = false;
      }, time);
    }
    let ws;
    this.send = (...args) => ws.try(...args);
    this.close = () => {
      this.ready = false;
      if (ws) {
        if (ws.readyState === ws.OPEN) ws.send(`rpc:disconnect ${this.uuid}`);
        ws.close();
        ws = null;
      }
    };
    function defer() {
      let resolve;
      let reject;
      const deferred = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      deferred.resolve = resolve;
      deferred.reject = reject;
      return deferred;
    }
    this.call = (msg, next) => {
      const id = `#${Date.now().toString(13)}`;
      this.send(msg, async () => {
        if (next) next();
        const timer = setTimeout(() => {
          if (this[id]) {
            this[id].reject();
            delete this[id];
          }
        }, 1260);
        try {
          this[id] = await defer();
        } catch (_e) {
          this.warn(_e, "RPC Failure");
        } finally {
          delete this[id];
          clearTimeout(timer);
        }
      });
    };
    this.deferred = Promise.resolve();
    this.upload = (key, file) => new Promise((ok2) => {
      setTimeout(() => ok2(console.log("UPLOAD", key, file)), 300);
    });
    this.unpack = (payload) => {
      const body = new FormData();
      const tasks = [];
      if (payload instanceof FormData) {
        for (const [key, value] of payload.entries()) {
          if (value instanceof File) {
            tasks.push(this.upload(key, value));
          } else {
            body.append(key, value);
          }
        }
      }
      this.deferred = this.deferred.then(() => Promise.all(tasks));
      return new URLSearchParams(body);
    };
    this.submit = (el, url, body, method) => {
      let data = this.unpack(body);
      url = url.replace(location.origin, "");
      url = method === "GET" && data ? `${url.split("?")[0]}?${data}` : url;
      data = method === "GET" && data ? "" : `	${data}`;
      this.deferred = this.deferred.then(() => {
        this.call(`rpc:request ${this.uuid} ${method} ${url}${data}`, () => {
          if (el) el.classList.remove("loading");
          updatePage("", url);
        });
      });
    };
    this.trigger = (e, kind, source, trigger, payload, callback) => {
      e.preventDefault();
      const call = trigger.dataset["ws:call"];
      const key = trigger.dataset["ws:yield"];
      const data = this.unpack(payload);
      this.call(`rpc:trigger ${this.uuid} ${source} ${kind} ${call}:${key}	${data}`, () => {
        if (callback) callback(trigger, "rpc");
      });
    };
    this.patchSVG = async (src) => {
      for (const node of document.querySelectorAll(`[data-location="${src}"]`)) {
        const result = await fetch(`${this.browser.prefix}${src}`).then((resp) => resp.text());
        const target = document.createElement("div");
        const source = node.tagName === "use" ? node.parentNode : node;
        const width = source.getAttribute("width");
        const height = source.getAttribute("height");
        target.innerHTML = result;
        const svg = target.childNodes[0];
        svg.setAttribute("data-location", src);
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        if (node.tagName === "use") {
          document.querySelector(node.getAttribute("xlink:href")).remove();
          node.parentNode.replaceWith(svg);
        } else {
          node.replaceWith(svg);
        }
      }
    };
    this.patchCSS = (src) => {
      const node = document.querySelector(`link[href^="${this.browser.prefix}/${src}"]`);
      const href = node.getAttribute("href").split("?")[0];
      node.href = `${href}?_${Date.now()}`;
    };
    this.patch = (sources) => {
      for (const src of sources) {
        if (src.includes(".svg")) this.patchSVG(src);
        if (src.includes(".css")) this.patchCSS(src);
      }
    };
    function connect(doc, uuid, ready) {
      return new Promise((ok2) => {
        ws = new WebSocket(`${protocol}://${location.host}`);
        ws.addEventListener("open", () => {
          ws.send(`rpc:connect ${uuid} ${doc}`);
          interval = 100;
          ready(doc, uuid, ws, ok2(ws));
        });
        ws.addEventListener("error", () => {
          setTimeout(() => connect(doc, uuid, ready).then(ok2), timeout("connect"));
        });
      });
    }
    function open(doc, uuid, socket) {
      socket.try = (msg, cb) => {
        if (socket.readyState !== socket.OPEN) {
          setTimeout(() => connect(doc, uuid, open).then(() => socket.try(msg, cb)), timeout("open"));
          return;
        }
        socket.send(msg);
        if (cb) cb(socket);
      };
    }
    let eventSource;
    this.start = () => {
      eventSource?.close();
      eventSource = new EventSource(`/${this.browser.prefix}?_=${this.uuid}`);
      eventSource.onopen = () => {
        this.ready = false;
        ws?.close();
        ws = null;
        this.sync();
      };
      eventSource.onerror = () => {
        if (ws && this.ready) {
          this.ready = false;
          ws.close();
          ws = null;
        }
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[RECONNECT SSE]");
        }
      };
      eventSource.onmessage = (event) => {
        console.log("@@", event.data);
      };
    };
    const queue = [];
    let wait;
    let ok;
    const run = async () => {
      if (this.browser.paused) {
        clearTimeout(wait);
        wait = setTimeout(run, 120);
        return;
      }
      if (!ok) {
        ok = true;
        this.browser.paused = true;
        await this.browser.runtime();
        this.browser.paused = false;
      }
      requestAnimationFrame(() => queue.length > 0 && Promise.resolve(queue.shift()(window.Jamrock)).then(run));
    };
    const refresh = (e) => {
      try {
        if (e?.isTrusted) {
          window.frames.top.Jamrock.Browser.reload(null, true);
        } else {
          window.Jamrock.Browser.reload(null, true);
        }
      } catch (error) {
        console.error("Error reloading:", error);
        window.Jamrock.Browser.reload(null, true);
      }
    };
    this.next = (_uuid) => {
      if (ws && ws.readyState === ws.OPEN) ws.send(`rpc:reconnect ${this.browser.request_uuid = _uuid}`);
    };
    this.sync = () => !this.headless && (!ws || ws.readyState !== ws.OPEN) && connect(this.document, this.uuid, open).then((socket) => {
      this.ready = true;
      let t;
      socket.addEventListener("message", (e) => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (socket.readyState === socket.OPEN) socket.send("alive");
        }, Math.floor(Math.random() * (7500 - 6e3)) + 6e3);
        if (e.data === "refresh") {
          refresh(e);
        }
        if (e.data.indexOf("reload ") === 0) {
          const [, ...sources] = e.data.split(/\s+/).filter(Boolean);
          if (!sources.length || sources.includes(this.document)) {
            refresh(e);
          } else {
            this.patch(sources);
          }
        } else if (e.data.indexOf("welcome ") === 0) {
          console.debug(e.data, this.location);
        } else if (e.data.indexOf("@debug ") === 0) {
          const offset = e.data.indexOf("{");
          const [, kind, args] = e.data.substr(0, offset).split(" ");
          console[kind](...args);
        } else if (e.data.indexOf("rpc:") === 0) {
          const payload = e.data.substr(4);
          const body = payload.includes("	") ? payload.substr(0, payload.indexOf("	")) : payload;
          const chunk = payload.substr(body.length + 1);
          let data = {};
          if (!(chunk === "null" || chunk === "undefined")) {
            data = JSON.parse(decode(chunk));
          }
          const [task, ...args] = body.split(/\s+/);
          if (args[0] !== this.uuid) return;
          if (task === "response") {
            console.log("[RESPONSE]", data);
            this.browser.sync(data, spaNavigate);
            return;
          }
          if (task === "failure") {
            this.browser.warn(data, "WebSocket Failure");
            return;
          }
          if (task !== "update") {
            console.debug("RPC", task, args);
            return;
          }
          queue.push(({ Fragment }) => {
            try {
              let direction = 0;
              if (args[2] === "append") direction = 1;
              if (args[2] === "prepend") direction = -1;
              if (args[0] !== this.uuid) return;
              return Fragment.patch(args[1], data, direction);
            } catch (_e) {
              return this.browser.warn(_e, `Failed to ${task} fragment '${args[1]}'`);
            }
          });
          throttle(run, 60);
        }
      });
    });
  }
};

// src/client/events.mjs
var EventHub = class {
  constructor(sockets) {
    this.browser = sockets.browser;
    this.sockets = sockets;
    this.loaded = [];
  }
  start() {
    this.handle("submit", this.onSubmit());
    this.handle("popstate", () => this.browser.reload());
    ["click", "input", "change"].forEach((e) => this.handle(e));
  }
  handle(e, cb) {
    const listeners = this.listeners || (this.listeners = {});
    const fn = cb || listeners[e] || (listeners[e] = this.onHandle(e));
    removeEventListener(e, fn, false);
    addEventListener(e, fn, false);
  }
  require(i, el, mod) {
    if (!this.loaded.includes(i)) {
      if (el && "source" in el.dataset) el.classList.add("loading");
    }
    return mod.then((result) => {
      if (!this.loaded.includes(i)) {
        this.loaded.push(i);
      }
      return result;
    });
  }
  // this could be async? also, for both submit/events
  confirm(el, cb) {
    const _confirm = findNodes("confirm", el) || null;
    if (window.debug) console.log(this);
    if (_confirm && !confirm(_confirm.dataset.confirm)) return;
    return cb();
  }
  onSubmit() {
    return (e) => {
      if ("confirm" in e.target.dataset || "async" in e.target.dataset || "trigger" in e.target.dataset) {
        e.preventDefault();
        this.require(0, e.target, import("./submit-SQV3PWYT.js")).then(({ handleSubmit }) => handleSubmit.call(this, e));
      }
    };
  }
  onHandle(kind) {
    return (e) => {
      if (e.metaKey && (e.shiftKey || e.altKey) && kind === "click") {
        let ref = findNodes("location", e.target, e.altKey ? 1 : 0);
        if (e.target === document.documentElement || e.target === document.body) {
          ref = document.documentElement;
        }
        if (ref && ref.dataset && "location" in ref.dataset) {
          if (this.sockets.ready) {
            this.sockets.send(`rpc:open ${ref.dataset.location}`);
          } else {
            fetch(`/__open?@=${encodeURIComponent(ref.dataset.location)}`);
          }
        }
        e.preventDefault();
        return;
      }
      if (e.target.closest("[data-component]")) return;
      if (kind === "input" && ["FORM", "INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) {
        const el = e.target.form || e.target;
        if (el.checkValidity()) {
          el.classList.remove("invalid");
        } else {
          el.classList.add("invalid");
          return;
        }
      }
      if (kind === "click" && (["BUTTON", "INPUT"].includes(e.target.tagName) && e.target.type === "submit") && e.target.form) return;
      if (["INPUT", "SELECT"].includes(e.target.tagName) && kind === "click") return;
      if (!["A", "INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) return;
      if (e.target.tagName === "SELECT" && kind === "input") return;
      if (e.target.tagName === "INPUT" && kind === "change") return;
      if (e.target.tagName === "A") {
        if (e.metaKey || e.ctrlKey || e.button !== 0 || e.target.protocol !== location.protocol || e.target.host !== location.host || e.target.hasAttribute("target")) return;
        e.preventDefault();
      }
      return this.confirm(e.target, () => {
        return this.require(1, e.target, import("./handler-O3ZSDFTM.js")).then(({ handleEvent }) => handleEvent.call(this, e, kind));
      });
    };
  }
  async loadURL(el, ...args) {
    return this.confirm(el, async () => {
      const fragment = findNodes("fragment", el) || null;
      const target = findNodes("target", el) || null;
      const wait = findNodes("wait", el) || null;
      const live = findNodes("live", el) || null;
      if (live) {
        if (fragment) args[4] = { ...args[4], "request-ref": fragment.dataset.fragment };
        return this.sockets.submit(el, ...args);
      }
      this.browser.pause();
      try {
        const { loadPage } = await import("./request-VNG4PQZV.js");
        return loadPage.call(this, { el, wait, target, fragment }, ...args);
      } finally {
        this.browser.resume();
      }
    });
  }
};

// src/client/browser.mjs
var Browser = class _Browser {
  constructor(state, prefix, version) {
    console.info("check", state.patch, version);
    const actions = new Proxy({}, {
      get: (_, prop) => (...args) => this.call(prop, ...args)
    });
    this.paused = false;
    this.prefix = prefix;
    this.version = version;
    this.actions = actions;
    this.csrf_token = state.csrf;
    this.request_uuid = state.uuid;
    this.request_method = state.method;
    this.warn = (e, msg) => import("./debugger-O6XU6CHV.js").then(({ showDebug }) => showDebug(e, msg));
    this.call = async (key, ...args) => {
      for (const [mod, calls] of Object.entries(window.Jamrock.Components.calls)) {
        if (calls.includes(key)) {
          console.log("[REMOTE CALL]", mod, key, args);
          return true;
        }
      }
      throw new Error(`Invoked action is not defined, given '${key}'`);
    };
    this.sync = async (payload, callback, element) => {
      const { scrollLeft, scrollTop } = document.documentElement;
      window.Jamrock.LiveSocket.start();
      window.Jamrock.Components.off();
      try {
        await this.runtime();
        if (this.teardown) this.teardown();
        window.Jamrock.Components.set(payload._, payload.$, payload.scripts, payload.fragments);
        Object.values(payload.styles).forEach((set) => set.forEach((_) => {
          payload.head.push(["link", { rel: "stylesheet", href: `${this.prefix}/${_}` }]);
        }));
        this.attrs(document.documentElement, payload.doc);
        this.patch(document.head, payload.head);
        this.attrs(document.body, payload.attrs);
        await callback(() => this.patch(document.body, payload.body));
      } finally {
        if (element) {
          const node = document.getElementById(element);
          if (node) node.scrollIntoView({ behavior: "smooth" });
        } else {
          document.documentElement.scrollLeft = scrollLeft;
          document.documentElement.scrollTop = scrollTop;
        }
        window.Jamrock.Components.on();
      }
    };
    this.attrs = (el, props) => {
      if (!el) return console.log({ props });
      el.getAttributeNames().forEach((name) => {
        if (!(name in props)) el.removeAttribute(name);
      });
      Object.entries(props).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    };
    this.patch = (el, vdom, force) => {
      if (!el) return console.log({ vdom });
      const { patchNode } = window.Jamrock.Runtime;
      if (!el.__vnode && !force) {
        while (el.firstChild && el.firstChild.nodeType === 3 && !el.firstChild.nodeValue.trim()) el.removeChild(el.firstChild);
        el.__vnode = this.children(el)[2];
      }
      return patchNode(el, !force ? el.__vnode : null, el.__vnode = vdom);
    };
    this.scripts = (js) => {
      if (!js) return;
      Object.values(js).forEach((set) => {
        set.forEach(([ref, id]) => {
          if (!ref) window.Jamrock.Components.import(id);
        });
      });
    };
    this.fetch = (url, data, method, headers) => fetch(url, {
      body: ["POST", "PUT", "PATCH"].includes(method) && data || void 0,
      method: method || "GET",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "cache-control": "max-age=0, no-cache, no-store, must-revalidate, post-check=0, pre-check=0",
        "x-requested-with": "XMLHttpRequest",
        "x-version": this.version,
        "csrf-token": this.csrf_token,
        "request-uuid": this.request_uuid,
        ...headers
      }
    });
    let block;
    this.reload = (cb, replay) => {
      if (block || this.paused) return setTimeout(() => cb && cb(), 120);
      window.Jamrock.EventHub.loadURL(
        document.activeElement,
        location.pathname,
        void 0,
        replay ? this.request_method : void 0,
        void 0,
        void 0,
        cb
      );
    };
    this.attribs = (node) => Nr(node);
    this.children = (node) => Tr(node, true);
    this.pause = () => {
      this.paused = true;
      if (window.Jamrock.Fragment) window.Jamrock.Fragment.teardown();
    };
    this.resume = () => {
      this.paused = false;
      clearTimeout(block);
      block = setTimeout(() => {
        block = null;
      }, 90);
      if (window.Jamrock.Fragment) window.Jamrock.Fragment.subscribe();
    };
    this.runtime = async () => {
      if (!window.Jamrock.Runtime) {
        const { createRender, createFragment } = await import("./elements-VR52OLEA.js");
        const { patchNode, createElement, renderToElement } = createRender();
        window.Jamrock.Fragment = createFragment({
          browser: this,
          patchNode,
          createElement
        });
        window.Jamrock.Runtime = {
          renderToElement,
          createElement,
          patchNode
        };
      }
    };
  }
  static init(Components, version, prefix, state, data) {
    const browser = new _Browser(state, prefix, version);
    const sockets = new LiveSocket(browser);
    const events = new EventHub(sockets);
    events.start();
    sockets.start();
    window.Jamrock = {
      Browser: browser,
      EventHub: events,
      LiveSocket: sockets,
      Components: new Components(browser, prefix, data)
    };
  }
};
export {
  Browser
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaWVudC9saXZlc29ja2V0Lm1qcyIsICIuLi9zcmMvY2xpZW50L2V2ZW50cy5tanMiLCAiLi4vc3JjL2NsaWVudC9icm93c2VyLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgZGVjb2RlLCB1cGRhdGVQYWdlLCBzcGFOYXZpZ2F0ZSB9IGZyb20gJy4uL3V0aWxzL2NsaWVudC5tanMnO1xuXG5jb25zdCBwcm90b2NvbCA9IGxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cDonID8gJ3dzJyA6ICd3c3MnO1xuXG5leHBvcnQgY2xhc3MgTGl2ZVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yKGJyb3dzZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3V1aWQnLCB7XG4gICAgICBnZXQ6ICgpID0+IGJyb3dzZXIucmVxdWVzdF91dWlkLFxuICAgIH0pO1xuXG4gICAgdGhpcy5yZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuYnJvd3NlciA9IGJyb3dzZXI7XG4gICAgdGhpcy5oZWFkbGVzcyA9IGJyb3dzZXIuaGVhZGxlc3M7XG4gICAgdGhpcy5kb2N1bWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmxvY2F0aW9uO1xuICAgIHRoaXMubG9jYXRpb24gPSBsb2NhdGlvbi5wYXRobmFtZS5zcGxpdCh0aGlzLnV1aWQpWzFdIHx8IGxvY2F0aW9uLnBhdGhuYW1lO1xuXG4gICAgY29uc29sZS5kZWJ1ZygnY29ubmVjdCcsIHRoaXMudXVpZCwgdGhpcy5sb2NhdGlvbik7XG5cbiAgICBsZXQgaW50ZXJ2YWwgPSAxMDA7XG4gICAgZnVuY3Rpb24gdGltZW91dChtc2cpIHtcbiAgICAgIGNvbnNvbGUuZGVidWcoJ1JFVFJZJywgbXNnLCBpbnRlcnZhbCk7XG4gICAgICBjb25zdCBtcyA9IGludGVydmFsO1xuICAgICAgaW50ZXJ2YWwgKj0gMjtcbiAgICAgIHJldHVybiBtcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvdHRsZShjYWxsYmFjaywgdGltZSkge1xuICAgICAgaWYgKGNhbGxiYWNrLnQpIHJldHVybjtcbiAgICAgIGNhbGxiYWNrLnQgPSB0cnVlO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIGNhbGxiYWNrLnQgPSBmYWxzZTtcbiAgICAgIH0sIHRpbWUpO1xuICAgIH1cblxuICAgIGxldCB3cztcbiAgICB0aGlzLnNlbmQgPSAoLi4uYXJncykgPT4gd3MudHJ5KC4uLmFyZ3MpO1xuICAgIHRoaXMuY2xvc2UgPSAoKSA9PiB7XG4gICAgICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gICAgICBpZiAod3MpIHtcbiAgICAgICAgaWYgKHdzLnJlYWR5U3RhdGUgPT09IHdzLk9QRU4pIHdzLnNlbmQoYHJwYzpkaXNjb25uZWN0ICR7dGhpcy51dWlkfWApO1xuICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICB3cyA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGRlZmVyKCkge1xuICAgICAgbGV0IHJlc29sdmU7XG4gICAgICBsZXQgcmVqZWN0O1xuXG4gICAgICBjb25zdCBkZWZlcnJlZCA9IG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcblxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBkZWZlcnJlZC5yZWplY3QgPSByZWplY3Q7XG4gICAgICByZXR1cm4gZGVmZXJyZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxsID0gKG1zZywgbmV4dCkgPT4ge1xuICAgICAgY29uc3QgaWQgPSBgIyR7RGF0ZS5ub3coKS50b1N0cmluZygxMyl9YDtcblxuICAgICAgdGhpcy5zZW5kKG1zZywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAobmV4dCkgbmV4dCgpO1xuXG4gICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXNbaWRdKSB7XG4gICAgICAgICAgICB0aGlzW2lkXS5yZWplY3QoKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW2lkXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDEyNjApO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpc1tpZF0gPSBhd2FpdCBkZWZlcigpO1xuICAgICAgICB9IGNhdGNoIChfZSkge1xuICAgICAgICAgIHRoaXMud2FybihfZSwgJ1JQQyBGYWlsdXJlJyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXNbaWRdO1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBGSVhNRTogdHJ5IHNlbmRpbmcgYmxvYiB0byB3cy4uLiBhIGJpZyBkaWZmZXJlbmNlIGhlcmVcbiAgICAvLyBpcyB0aGF0IHdlIGNvdWxkIG9taXQgc29tZSBmaWVsZHMgaWYgdGhleSB3ZXJlIGFscmVhZHkgc2VudC4uLlxuICAgIC8vIHNvLCB3ZSBjYW4gcGVyc2lzdCBhIGxvY2FsIHN0YXRlIG9uIHRoZSBydW5uaW5nIHNlcnZlciBhdHRhY2hlZFxuICAgIC8vIHRvIHRoZSB3ZWJzb2NrZXQuLi5cbiAgICB0aGlzLmRlZmVycmVkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgdGhpcy51cGxvYWQgPSAoa2V5LCBmaWxlKSA9PiBuZXcgUHJvbWlzZShvayA9PiB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IG9rKGNvbnNvbGUubG9nKCdVUExPQUQnLCBrZXksIGZpbGUpKSwgMzAwKTtcbiAgICB9KTtcbiAgICB0aGlzLnVucGFjayA9IHBheWxvYWQgPT4ge1xuICAgICAgY29uc3QgYm9keSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgY29uc3QgdGFza3MgPSBbXTtcblxuICAgICAgaWYgKHBheWxvYWQgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwYXlsb2FkLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgICAgICAgIHRhc2tzLnB1c2godGhpcy51cGxvYWQoa2V5LCB2YWx1ZSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib2R5LmFwcGVuZChrZXksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5kZWZlcnJlZCA9IHRoaXMuZGVmZXJyZWQudGhlbigoKSA9PiBQcm9taXNlLmFsbCh0YXNrcykpO1xuICAgICAgcmV0dXJuIG5ldyBVUkxTZWFyY2hQYXJhbXMoYm9keSk7XG4gICAgfTtcblxuICAgIHRoaXMuc3VibWl0ID0gKGVsLCB1cmwsIGJvZHksIG1ldGhvZCkgPT4ge1xuICAgICAgbGV0IGRhdGEgPSB0aGlzLnVucGFjayhib2R5KTtcblxuICAgICAgdXJsID0gdXJsLnJlcGxhY2UobG9jYXRpb24ub3JpZ2luLCAnJyk7XG4gICAgICB1cmwgPSBtZXRob2QgPT09ICdHRVQnICYmIGRhdGEgPyBgJHt1cmwuc3BsaXQoJz8nKVswXX0/JHtkYXRhfWAgOiB1cmw7XG4gICAgICBkYXRhID0gbWV0aG9kID09PSAnR0VUJyAmJiBkYXRhID8gJycgOiBgXFx0JHtkYXRhfWA7XG5cbiAgICAgIHRoaXMuZGVmZXJyZWQgPSB0aGlzLmRlZmVycmVkLnRoZW4oKCkgPT4ge1xuICAgICAgICB0aGlzLmNhbGwoYHJwYzpyZXF1ZXN0ICR7dGhpcy51dWlkfSAke21ldGhvZH0gJHt1cmx9JHtkYXRhfWAsICgpID0+IHtcbiAgICAgICAgICBpZiAoZWwpIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2xvYWRpbmcnKTtcbiAgICAgICAgICB1cGRhdGVQYWdlKCcnLCB1cmwpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBGSVhNRTogcmV0aGluayBzaW5jZSBAbGl2ZSBzZWVtcyB0byBiZSB0cmFuc3BhcmVudFxuICAgIHRoaXMudHJpZ2dlciA9IChlLCBraW5kLCBzb3VyY2UsIHRyaWdnZXIsIHBheWxvYWQsIGNhbGxiYWNrKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGNvbnN0IGNhbGwgPSB0cmlnZ2VyLmRhdGFzZXRbJ3dzOmNhbGwnXTtcbiAgICAgIGNvbnN0IGtleSA9IHRyaWdnZXIuZGF0YXNldFsnd3M6eWllbGQnXTtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnVucGFjayhwYXlsb2FkKTtcblxuICAgICAgdGhpcy5jYWxsKGBycGM6dHJpZ2dlciAke3RoaXMudXVpZH0gJHtzb3VyY2V9ICR7a2luZH0gJHtjYWxsfToke2tleX1cXHQke2RhdGF9YCwgKCkgPT4ge1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHRyaWdnZXIsICdycGMnKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnBhdGNoU1ZHID0gYXN5bmMgc3JjID0+IHtcbiAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGBbZGF0YS1sb2NhdGlvbj1cIiR7c3JjfVwiXWApKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZldGNoKGAke3RoaXMuYnJvd3Nlci5wcmVmaXh9JHtzcmN9YCkudGhlbihyZXNwID0+IHJlc3AudGV4dCgpKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IG5vZGUudGFnTmFtZSA9PT0gJ3VzZSdcbiAgICAgICAgICA/IG5vZGUucGFyZW50Tm9kZVxuICAgICAgICAgIDogbm9kZTtcblxuICAgICAgICBjb25zdCB3aWR0aCA9IHNvdXJjZS5nZXRBdHRyaWJ1dGUoJ3dpZHRoJyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHNvdXJjZS5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpO1xuICAgICAgICB0YXJnZXQuaW5uZXJIVE1MID0gcmVzdWx0O1xuXG4gICAgICAgIGNvbnN0IHN2ZyA9IHRhcmdldC5jaGlsZE5vZGVzWzBdO1xuICAgICAgICBzdmcuc2V0QXR0cmlidXRlKCdkYXRhLWxvY2F0aW9uJywgc3JjKTtcbiAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCk7XG4gICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCk7XG5cbiAgICAgICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ3VzZScpIHtcbiAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG5vZGUuZ2V0QXR0cmlidXRlKCd4bGluazpocmVmJykpLnJlbW92ZSgpO1xuICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZXBsYWNlV2l0aChzdmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGUucmVwbGFjZVdpdGgoc3ZnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnBhdGNoQ1NTID0gc3JjID0+IHtcbiAgICAgIGNvbnN0IG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBsaW5rW2hyZWZePVwiJHt0aGlzLmJyb3dzZXIucHJlZml4fS8ke3NyY31cIl1gKTtcbiAgICAgIGNvbnN0IGhyZWYgPSBub2RlLmdldEF0dHJpYnV0ZSgnaHJlZicpLnNwbGl0KCc/JylbMF07XG4gICAgICBub2RlLmhyZWYgPSBgJHtocmVmfT9fJHtEYXRlLm5vdygpfWA7XG4gICAgfTtcblxuICAgIHRoaXMucGF0Y2ggPSBzb3VyY2VzID0+IHtcbiAgICAgIGZvciAoY29uc3Qgc3JjIG9mIHNvdXJjZXMpIHtcbiAgICAgICAgaWYgKHNyYy5pbmNsdWRlcygnLnN2ZycpKSB0aGlzLnBhdGNoU1ZHKHNyYyk7XG4gICAgICAgIGlmIChzcmMuaW5jbHVkZXMoJy5jc3MnKSkgdGhpcy5wYXRjaENTUyhzcmMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSAoKSA9PiB0aGlzLmNsb3NlKCkgfHwgbnVsbDtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3QoZG9jLCB1dWlkLCByZWFkeSkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKG9rID0+IHtcbiAgICAgICAgd3MgPSBuZXcgV2ViU29ja2V0KGAke3Byb3RvY29sfTovLyR7bG9jYXRpb24uaG9zdH1gKTtcblxuICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgKCkgPT4ge1xuICAgICAgICAgIHdzLnNlbmQoYHJwYzpjb25uZWN0ICR7dXVpZH0gJHtkb2N9YCk7XG4gICAgICAgICAgaW50ZXJ2YWwgPSAxMDA7XG4gICAgICAgICAgcmVhZHkoZG9jLCB1dWlkLCB3cywgb2sod3MpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBjb25uZWN0KGRvYywgdXVpZCwgcmVhZHkpLnRoZW4ob2spLCB0aW1lb3V0KCdjb25uZWN0JykpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9wZW4oZG9jLCB1dWlkLCBzb2NrZXQpIHtcbiAgICAgIHNvY2tldC50cnkgPSAobXNnLCBjYikgPT4ge1xuICAgICAgICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgIT09IHNvY2tldC5PUEVOKSB7XG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBjb25uZWN0KGRvYywgdXVpZCwgb3BlbikudGhlbigoKSA9PiBzb2NrZXQudHJ5KG1zZywgY2IpKSwgdGltZW91dCgnb3BlbicpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc29ja2V0LnNlbmQobXNnKTtcbiAgICAgICAgaWYgKGNiKSBjYihzb2NrZXQpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBsZXQgZXZlbnRTb3VyY2U7XG4gICAgdGhpcy5zdGFydCA9ICgpID0+IHtcbiAgICAgIGV2ZW50U291cmNlPy5jbG9zZSgpO1xuICAgICAgZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoYC8ke3RoaXMuYnJvd3Nlci5wcmVmaXh9P189JHt0aGlzLnV1aWR9YCk7XG4gICAgICBldmVudFNvdXJjZS5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVhZHkgPSBmYWxzZTtcbiAgICAgICAgd3M/LmNsb3NlKCk7XG4gICAgICAgIHdzID0gbnVsbDtcbiAgICAgICAgdGhpcy5zeW5jKCk7XG4gICAgICB9O1xuICAgICAgZXZlbnRTb3VyY2Uub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgaWYgKHdzICYmIHRoaXMucmVhZHkpIHtcbiAgICAgICAgICB0aGlzLnJlYWR5ID0gZmFsc2U7XG4gICAgICAgICAgd3MuY2xvc2UoKTtcbiAgICAgICAgICB3cyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZlbnRTb3VyY2UucmVhZHlTdGF0ZSA9PT0gRXZlbnRTb3VyY2UuQ0xPU0VEKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tSRUNPTk5FQ1QgU1NFXScpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZXZlbnRTb3VyY2Uub25tZXNzYWdlID0gZXZlbnQgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnQEAnLCBldmVudC5kYXRhKTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGNvbnN0IHF1ZXVlID0gW107XG5cbiAgICBsZXQgd2FpdDtcbiAgICBsZXQgb2s7XG4gICAgY29uc3QgcnVuID0gYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuYnJvd3Nlci5wYXVzZWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHdhaXQpO1xuICAgICAgICB3YWl0ID0gc2V0VGltZW91dChydW4sIDEyMCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFvaykge1xuICAgICAgICBvayA9IHRydWU7XG4gICAgICAgIHRoaXMuYnJvd3Nlci5wYXVzZWQgPSB0cnVlO1xuICAgICAgICBhd2FpdCB0aGlzLmJyb3dzZXIucnVudGltZSgpO1xuICAgICAgICB0aGlzLmJyb3dzZXIucGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBxdWV1ZS5sZW5ndGggPiAwICYmIFByb21pc2UucmVzb2x2ZShxdWV1ZS5zaGlmdCgpKHdpbmRvdy5KYW1yb2NrKSkudGhlbihydW4pKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVmcmVzaCA9IGUgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGU/LmlzVHJ1c3RlZCkge1xuICAgICAgICAgIC8vIHdpbmRvdy5mcmFtZXMudG9wLkphbXJvY2suQ29tcG9uZW50cy5yZWxvYWQoZS5kYXRhKTtcbiAgICAgICAgICB3aW5kb3cuZnJhbWVzLnRvcC5KYW1yb2NrLkJyb3dzZXIucmVsb2FkKG51bGwsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHdpbmRvdy5KYW1yb2NrLkNvbXBvbmVudHMucmVsb2FkKGUuZGF0YSk7XG4gICAgICAgICAgd2luZG93LkphbXJvY2suQnJvd3Nlci5yZWxvYWQobnVsbCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlbG9hZGluZzonLCBlcnJvcik7XG4gICAgICAgIHdpbmRvdy5KYW1yb2NrLkJyb3dzZXIucmVsb2FkKG51bGwsIHRydWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLm5leHQgPSBfdXVpZCA9PiB7XG4gICAgICBpZiAod3MgJiYgd3MucmVhZHlTdGF0ZSA9PT0gd3MuT1BFTikgd3Muc2VuZChgcnBjOnJlY29ubmVjdCAke3RoaXMuYnJvd3Nlci5yZXF1ZXN0X3V1aWQgPSBfdXVpZH1gKTtcbiAgICB9O1xuXG4gICAgLy8gRklYTUU6IHdlIGNvdWxkIGFkZCBhIGxheWVyIGFmdGVyIHNvbWUgdGltZSBvZiBpbmFjdGl2aXR5LCBvbmNlIHdlIGRldGVjdFxuICAgIC8vIHdlIG5vdCBsb25nZXIgaGF2ZSB3cyBjb25uZWN0aXZpdHkuLi4gdGhlbiwgb25jZSBjbGlja2VkIHdlIHJlY29ubmVjdCBhbmQgc28hXG4gICAgdGhpcy5zeW5jID0gKCkgPT4gIXRoaXMuaGVhZGxlc3MgJiYgKCF3cyB8fCB3cy5yZWFkeVN0YXRlICE9PSB3cy5PUEVOKSAmJiBjb25uZWN0KHRoaXMuZG9jdW1lbnQsIHRoaXMudXVpZCwgb3BlbikudGhlbihzb2NrZXQgPT4ge1xuICAgICAgdGhpcy5yZWFkeSA9IHRydWU7XG5cbiAgICAgIGxldCB0O1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBlID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgICAgICB0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHNvY2tldC5yZWFkeVN0YXRlID09PSBzb2NrZXQuT1BFTikgc29ja2V0LnNlbmQoJ2FsaXZlJyk7XG4gICAgICAgIH0sIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICg3NTAwIC0gNjAwMCkpICsgNjAwMCk7XG5cbiAgICAgICAgaWYgKGUuZGF0YSA9PT0gJ3JlZnJlc2gnKSB7XG4gICAgICAgICAgcmVmcmVzaChlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlLmRhdGEuaW5kZXhPZigncmVsb2FkICcpID09PSAwKSB7XG4gICAgICAgICAgY29uc3QgWywgLi4uc291cmNlc10gPSBlLmRhdGEuc3BsaXQoL1xccysvKS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICAgICAgICBpZiAoIXNvdXJjZXMubGVuZ3RoIHx8IHNvdXJjZXMuaW5jbHVkZXModGhpcy5kb2N1bWVudCkpIHtcbiAgICAgICAgICAgIHJlZnJlc2goZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF0Y2goc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGUuZGF0YS5pbmRleE9mKCd3ZWxjb21lICcpID09PSAwKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhlLmRhdGEsIHRoaXMubG9jYXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGUuZGF0YS5pbmRleE9mKCdAZGVidWcgJykgPT09IDApIHtcbiAgICAgICAgICBjb25zdCBvZmZzZXQgPSBlLmRhdGEuaW5kZXhPZigneycpO1xuICAgICAgICAgIGNvbnN0IFssIGtpbmQsIGFyZ3NdID0gZS5kYXRhLnN1YnN0cigwLCBvZmZzZXQpLnNwbGl0KCcgJyk7XG5cbiAgICAgICAgICBjb25zb2xlW2tpbmRdKC4uLmFyZ3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGUuZGF0YS5pbmRleE9mKCdycGM6JykgPT09IDApIHtcbiAgICAgICAgICBjb25zdCBwYXlsb2FkID0gZS5kYXRhLnN1YnN0cig0KTtcbiAgICAgICAgICBjb25zdCBib2R5ID0gcGF5bG9hZC5pbmNsdWRlcygnXFx0JylcbiAgICAgICAgICAgID8gcGF5bG9hZC5zdWJzdHIoMCwgcGF5bG9hZC5pbmRleE9mKCdcXHQnKSlcbiAgICAgICAgICAgIDogcGF5bG9hZDtcblxuICAgICAgICAgIGNvbnN0IGNodW5rID0gcGF5bG9hZC5zdWJzdHIoYm9keS5sZW5ndGggKyAxKTtcblxuICAgICAgICAgIGxldCBkYXRhID0ge307XG4gICAgICAgICAgaWYgKCEoY2h1bmsgPT09ICdudWxsJyB8fCBjaHVuayA9PT0gJ3VuZGVmaW5lZCcpKSB7XG4gICAgICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkZWNvZGUoY2h1bmspKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBbdGFzaywgLi4uYXJnc10gPSBib2R5LnNwbGl0KC9cXHMrLyk7XG5cbiAgICAgICAgICBpZiAoYXJnc1swXSAhPT0gdGhpcy51dWlkKSByZXR1cm47XG5cbiAgICAgICAgICBpZiAodGFzayA9PT0gJ3Jlc3BvbnNlJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tSRVNQT05TRV0nLCBkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuYnJvd3Nlci5zeW5jKGRhdGEsIHNwYU5hdmlnYXRlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGFzayA9PT0gJ2ZhaWx1cmUnKSB7XG4gICAgICAgICAgICB0aGlzLmJyb3dzZXIud2FybihkYXRhLCAnV2ViU29ja2V0IEZhaWx1cmUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGFzayAhPT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JQQycsIHRhc2ssIGFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHF1ZXVlLnB1c2goKHsgRnJhZ21lbnQgfSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGlmIChhcmdzWzJdID09PSAnYXBwZW5kJykgZGlyZWN0aW9uID0gMTtcbiAgICAgICAgICAgICAgaWYgKGFyZ3NbMl0gPT09ICdwcmVwZW5kJykgZGlyZWN0aW9uID0gLTE7XG4gICAgICAgICAgICAgIGlmIChhcmdzWzBdICE9PSB0aGlzLnV1aWQpIHJldHVybjtcblxuICAgICAgICAgICAgICByZXR1cm4gRnJhZ21lbnQucGF0Y2goYXJnc1sxXSwgZGF0YSwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmJyb3dzZXIud2FybihfZSwgYEZhaWxlZCB0byAke3Rhc2t9IGZyYWdtZW50ICcke2FyZ3NbMV19J2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRocm90dGxlKHJ1biwgNjApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIiwgImltcG9ydCB7IGZpbmROb2RlcyB9IGZyb20gJy4uL3V0aWxzL2NsaWVudC5tanMnO1xuXG5leHBvcnQgY2xhc3MgRXZlbnRIdWIge1xuICBjb25zdHJ1Y3Rvcihzb2NrZXRzKSB7XG4gICAgdGhpcy5icm93c2VyID0gc29ja2V0cy5icm93c2VyO1xuICAgIHRoaXMuc29ja2V0cyA9IHNvY2tldHM7XG4gICAgdGhpcy5sb2FkZWQgPSBbXTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIHRoaXMuaGFuZGxlKCdzdWJtaXQnLCB0aGlzLm9uU3VibWl0KCkpO1xuICAgIHRoaXMuaGFuZGxlKCdwb3BzdGF0ZScsICgpID0+IHRoaXMuYnJvd3Nlci5yZWxvYWQoKSk7XG5cbiAgICBbJ2NsaWNrJywgJ2lucHV0JywgJ2NoYW5nZSddLmZvckVhY2goZSA9PiB0aGlzLmhhbmRsZShlKSk7XG4gIH1cblxuICBoYW5kbGUoZSwgY2IpIHtcbiAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycyB8fCAodGhpcy5saXN0ZW5lcnMgPSB7fSk7XG4gICAgY29uc3QgZm4gPSBjYiB8fCBsaXN0ZW5lcnNbZV0gfHwgKGxpc3RlbmVyc1tlXSA9IHRoaXMub25IYW5kbGUoZSkpO1xuXG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihlLCBmbiwgZmFsc2UpO1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoZSwgZm4sIGZhbHNlKTtcbiAgfVxuXG4gIHJlcXVpcmUoaSwgZWwsIG1vZCkge1xuICAgIGlmICghdGhpcy5sb2FkZWQuaW5jbHVkZXMoaSkpIHtcbiAgICAgIGlmIChlbCAmJiAnc291cmNlJyBpbiBlbC5kYXRhc2V0KSBlbC5jbGFzc0xpc3QuYWRkKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIHJldHVybiBtb2QudGhlbihyZXN1bHQgPT4ge1xuICAgICAgaWYgKCF0aGlzLmxvYWRlZC5pbmNsdWRlcyhpKSkge1xuICAgICAgICB0aGlzLmxvYWRlZC5wdXNoKGkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHRoaXMgY291bGQgYmUgYXN5bmM/IGFsc28sIGZvciBib3RoIHN1Ym1pdC9ldmVudHNcbiAgY29uZmlybShlbCwgY2IpIHtcbiAgICBjb25zdCBfY29uZmlybSA9IGZpbmROb2RlcygnY29uZmlybScsIGVsKSB8fCBudWxsO1xuICAgIGlmICh3aW5kb3cuZGVidWcpIGNvbnNvbGUubG9nKHRoaXMpO1xuICAgIGlmIChfY29uZmlybSAmJiAhY29uZmlybShfY29uZmlybS5kYXRhc2V0LmNvbmZpcm0pKSByZXR1cm47XG4gICAgcmV0dXJuIGNiKCk7XG4gIH1cblxuICBvblN1Ym1pdCgpIHtcbiAgICByZXR1cm4gZSA9PiB7XG4gICAgICBpZiAoXG4gICAgICAgICdjb25maXJtJyBpbiBlLnRhcmdldC5kYXRhc2V0XG4gICAgICAgIHx8ICdhc3luYycgaW4gZS50YXJnZXQuZGF0YXNldFxuICAgICAgICB8fCAndHJpZ2dlcicgaW4gZS50YXJnZXQuZGF0YXNldFxuICAgICAgKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5yZXF1aXJlKDAsIGUudGFyZ2V0LCBpbXBvcnQoJy4vc3VibWl0Lm1qcycpKS50aGVuKCh7IGhhbmRsZVN1Ym1pdCB9KSA9PiBoYW5kbGVTdWJtaXQuY2FsbCh0aGlzLCBlKSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIG9uSGFuZGxlKGtpbmQpIHtcbiAgICByZXR1cm4gZSA9PiB7XG4gICAgICBpZiAoZS5tZXRhS2V5ICYmIChlLnNoaWZ0S2V5IHx8IGUuYWx0S2V5KSAmJiBraW5kID09PSAnY2xpY2snKSB7XG4gICAgICAgIGxldCByZWYgPSBmaW5kTm9kZXMoJ2xvY2F0aW9uJywgZS50YXJnZXQsIGUuYWx0S2V5ID8gMSA6IDApO1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fCBlLnRhcmdldCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAgIHJlZiA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZWYgJiYgcmVmLmRhdGFzZXQgJiYgJ2xvY2F0aW9uJyBpbiByZWYuZGF0YXNldCkge1xuICAgICAgICAgIGlmICh0aGlzLnNvY2tldHMucmVhZHkpIHtcbiAgICAgICAgICAgIHRoaXMuc29ja2V0cy5zZW5kKGBycGM6b3BlbiAke3JlZi5kYXRhc2V0LmxvY2F0aW9ufWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmZXRjaChgL19fb3Blbj9APSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlZi5kYXRhc2V0LmxvY2F0aW9uKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChlLnRhcmdldC5jbG9zZXN0KCdbZGF0YS1jb21wb25lbnRdJykpIHJldHVybjtcblxuICAgICAgaWYgKGtpbmQgPT09ICdpbnB1dCcgJiYgWydGT1JNJywgJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluY2x1ZGVzKGUudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICAgIGNvbnN0IGVsID0gZS50YXJnZXQuZm9ybSB8fCBlLnRhcmdldDtcblxuICAgICAgICBpZiAoZWwuY2hlY2tWYWxpZGl0eSgpKSB7XG4gICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnaW52YWxpZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2ludmFsaWQnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGtpbmQgPT09ICdjbGljaycgJiYgKFsnQlVUVE9OJywgJ0lOUFVUJ10uaW5jbHVkZXMoZS50YXJnZXQudGFnTmFtZSkgJiYgZS50YXJnZXQudHlwZSA9PT0gJ3N1Ym1pdCcpICYmIGUudGFyZ2V0LmZvcm0pIHJldHVybjtcblxuICAgICAgaWYgKFsnSU5QVVQnLCAnU0VMRUNUJ10uaW5jbHVkZXMoZS50YXJnZXQudGFnTmFtZSkgJiYga2luZCA9PT0gJ2NsaWNrJykgcmV0dXJuO1xuICAgICAgaWYgKCFbJ0EnLCAnSU5QVVQnLCAnU0VMRUNUJywgJ0JVVFRPTiddLmluY2x1ZGVzKGUudGFyZ2V0LnRhZ05hbWUpKSByZXR1cm47XG4gICAgICBpZiAoZS50YXJnZXQudGFnTmFtZSA9PT0gJ1NFTEVDVCcgJiYga2luZCA9PT0gJ2lucHV0JykgcmV0dXJuO1xuICAgICAgaWYgKGUudGFyZ2V0LnRhZ05hbWUgPT09ICdJTlBVVCcgJiYga2luZCA9PT0gJ2NoYW5nZScpIHJldHVybjtcblxuICAgICAgaWYgKGUudGFyZ2V0LnRhZ05hbWUgPT09ICdBJykge1xuICAgICAgICBpZiAoKGUubWV0YUtleSB8fCBlLmN0cmxLZXkgfHwgZS5idXR0b24gIT09IDApXG4gICAgICAgICAgfHwgZS50YXJnZXQucHJvdG9jb2wgIT09IGxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgfHwgZS50YXJnZXQuaG9zdCAhPT0gbG9jYXRpb24uaG9zdFxuICAgICAgICAgIHx8IGUudGFyZ2V0Lmhhc0F0dHJpYnV0ZSgndGFyZ2V0JylcbiAgICAgICAgKSByZXR1cm47XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuY29uZmlybShlLnRhcmdldCwgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1aXJlKDEsIGUudGFyZ2V0LCBpbXBvcnQoJy4vaGFuZGxlci5tanMnKSlcbiAgICAgICAgICAudGhlbigoeyBoYW5kbGVFdmVudCB9KSA9PiBoYW5kbGVFdmVudC5jYWxsKHRoaXMsIGUsIGtpbmQpKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICBhc3luYyBsb2FkVVJMKGVsLCAuLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlybShlbCwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBmaW5kTm9kZXMoJ2ZyYWdtZW50JywgZWwpIHx8IG51bGw7XG4gICAgICBjb25zdCB0YXJnZXQgPSBmaW5kTm9kZXMoJ3RhcmdldCcsIGVsKSB8fCBudWxsO1xuICAgICAgY29uc3Qgd2FpdCA9IGZpbmROb2Rlcygnd2FpdCcsIGVsKSB8fCBudWxsO1xuICAgICAgY29uc3QgbGl2ZSA9IGZpbmROb2RlcygnbGl2ZScsIGVsKSB8fCBudWxsO1xuXG4gICAgICBpZiAobGl2ZSkge1xuICAgICAgICBpZiAoZnJhZ21lbnQpIGFyZ3NbNF0gPSB7IC4uLmFyZ3NbNF0sICdyZXF1ZXN0LXJlZic6IGZyYWdtZW50LmRhdGFzZXQuZnJhZ21lbnQgfTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0cy5zdWJtaXQoZWwsIC4uLmFyZ3MpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmJyb3dzZXIucGF1c2UoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgbG9hZFBhZ2UgfSA9IGF3YWl0IGltcG9ydCgnLi9yZXF1ZXN0Lm1qcycpO1xuXG4gICAgICAgIHJldHVybiBsb2FkUGFnZS5jYWxsKHRoaXMsIHsgZWwsIHdhaXQsIHRhcmdldCwgZnJhZ21lbnQgfSwgLi4uYXJncyk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0aGlzLmJyb3dzZXIucmVzdW1lKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyB0b05vZGVzLCB0b0F0dHJzIH0gZnJvbSAnLi4vdXRpbHMvY2xpZW50Lm1qcyc7XG5pbXBvcnQgeyBMaXZlU29ja2V0IH0gZnJvbSAnLi9saXZlc29ja2V0Lm1qcyc7XG5pbXBvcnQgeyBFdmVudEh1YiB9IGZyb20gJy4vZXZlbnRzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBCcm93c2VyIHtcbiAgY29uc3RydWN0b3Ioc3RhdGUsIHByZWZpeCwgdmVyc2lvbikge1xuICAgIGNvbnNvbGUuaW5mbygnY2hlY2snLCBzdGF0ZS5wYXRjaCwgdmVyc2lvbik7XG5cbiAgICBjb25zdCBhY3Rpb25zID0gbmV3IFByb3h5KHt9LCB7XG4gICAgICBnZXQ6IChfLCBwcm9wKSA9PiAoLi4uYXJncykgPT4gdGhpcy5jYWxsKHByb3AsIC4uLmFyZ3MpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeDtcbiAgICB0aGlzLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgIHRoaXMuYWN0aW9ucyA9IGFjdGlvbnM7XG4gICAgdGhpcy5jc3JmX3Rva2VuID0gc3RhdGUuY3NyZjtcbiAgICB0aGlzLnJlcXVlc3RfdXVpZCA9IHN0YXRlLnV1aWQ7XG4gICAgdGhpcy5yZXF1ZXN0X21ldGhvZCA9IHN0YXRlLm1ldGhvZDtcblxuICAgIHRoaXMud2FybiA9IChlLCBtc2cpID0+IGltcG9ydCgnLi9kZWJ1Z2dlci5tanMnKS50aGVuKCh7IHNob3dEZWJ1ZyB9KSA9PiBzaG93RGVidWcoZSwgbXNnKSk7XG5cbiAgICB0aGlzLmNhbGwgPSBhc3luYyAoa2V5LCAuLi5hcmdzKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFttb2QsIGNhbGxzXSBvZiBPYmplY3QuZW50cmllcyh3aW5kb3cuSmFtcm9jay5Db21wb25lbnRzLmNhbGxzKSkge1xuICAgICAgICBpZiAoY2FsbHMuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbUkVNT1RFIENBTExdJywgbW9kLCBrZXksIGFyZ3MpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludm9rZWQgYWN0aW9uIGlzIG5vdCBkZWZpbmVkLCBnaXZlbiAnJHtrZXl9J2ApO1xuICAgIH07XG5cbiAgICB0aGlzLnN5bmMgPSBhc3luYyAocGF5bG9hZCwgY2FsbGJhY2ssIGVsZW1lbnQpID0+IHtcbiAgICAgIGNvbnN0IHsgc2Nyb2xsTGVmdCwgc2Nyb2xsVG9wIH0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICAgIHdpbmRvdy5KYW1yb2NrLkxpdmVTb2NrZXQuc3RhcnQoKTtcbiAgICAgIHdpbmRvdy5KYW1yb2NrLkNvbXBvbmVudHMub2ZmKCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMucnVudGltZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLnRlYXJkb3duKSB0aGlzLnRlYXJkb3duKCk7XG5cbiAgICAgICAgLy8gbm9ybWFsaXplIGtleXMhIVxuICAgICAgICAvLyBGSVhNRTogaG93IHRvIHBhdGNoIGZyYWdtZW50cz9cbiAgICAgICAgd2luZG93LkphbXJvY2suQ29tcG9uZW50cy5zZXQocGF5bG9hZC5fLCBwYXlsb2FkLiQsIHBheWxvYWQuc2NyaXB0cywgcGF5bG9hZC5mcmFnbWVudHMpO1xuXG4gICAgICAgIE9iamVjdC52YWx1ZXMocGF5bG9hZC5zdHlsZXMpXG4gICAgICAgICAgLmZvckVhY2goc2V0ID0+IHNldC5mb3JFYWNoKF8gPT4ge1xuICAgICAgICAgICAgcGF5bG9hZC5oZWFkLnB1c2goWydsaW5rJywgeyByZWw6ICdzdHlsZXNoZWV0JywgaHJlZjogYCR7dGhpcy5wcmVmaXh9LyR7X31gIH1dKTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgICAgdGhpcy5hdHRycyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIHBheWxvYWQuZG9jKTtcbiAgICAgICAgdGhpcy5wYXRjaChkb2N1bWVudC5oZWFkLCBwYXlsb2FkLmhlYWQpO1xuICAgICAgICB0aGlzLmF0dHJzKGRvY3VtZW50LmJvZHksIHBheWxvYWQuYXR0cnMpO1xuXG4gICAgICAgIGF3YWl0IGNhbGxiYWNrKCgpID0+IHRoaXMucGF0Y2goZG9jdW1lbnQuYm9keSwgcGF5bG9hZC5ib2R5KSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICAgIGNvbnN0IG5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50KTtcbiAgICAgICAgICBpZiAobm9kZSkgbm9kZS5zY3JvbGxJbnRvVmlldyh7IGJlaGF2aW9yOiAnc21vb3RoJyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCA9IHNjcm9sbExlZnQ7XG4gICAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCA9IHNjcm9sbFRvcDtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuSmFtcm9jay5Db21wb25lbnRzLm9uKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuYXR0cnMgPSAoZWwsIHByb3BzKSA9PiB7XG4gICAgICBpZiAoIWVsKSByZXR1cm4gY29uc29sZS5sb2coeyBwcm9wcyB9KTtcbiAgICAgIGVsLmdldEF0dHJpYnV0ZU5hbWVzKCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBwcm9wcykpIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgIH0pO1xuICAgICAgT2JqZWN0LmVudHJpZXMocHJvcHMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5wYXRjaCA9IChlbCwgdmRvbSwgZm9yY2UpID0+IHtcbiAgICAgIGlmICghZWwpIHJldHVybiBjb25zb2xlLmxvZyh7IHZkb20gfSk7XG4gICAgICBjb25zdCB7IHBhdGNoTm9kZSB9ID0gd2luZG93LkphbXJvY2suUnVudGltZTtcblxuICAgICAgaWYgKCFlbC5fX3Zub2RlICYmICFmb3JjZSkge1xuICAgICAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZFxuICAgICAgICAgICYmIGVsLmZpcnN0Q2hpbGQubm9kZVR5cGUgPT09IDNcbiAgICAgICAgICAmJiAhZWwuZmlyc3RDaGlsZC5ub2RlVmFsdWUudHJpbSgpKSBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcblxuICAgICAgICBlbC5fX3Zub2RlID0gdGhpcy5jaGlsZHJlbihlbClbMl07XG4gICAgICB9XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKCdbUEFUQ0hdJywgZWwuX192bm9kZSwgdmRvbSk7XG4gICAgICByZXR1cm4gcGF0Y2hOb2RlKGVsLCAhZm9yY2UgPyBlbC5fX3Zub2RlIDogbnVsbCwgZWwuX192bm9kZSA9IHZkb20pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgfTtcblxuICAgIHRoaXMuc2NyaXB0cyA9IGpzID0+IHtcbiAgICAgIGlmICghanMpIHJldHVybjtcbiAgICAgIE9iamVjdC52YWx1ZXMoanMpLmZvckVhY2goc2V0ID0+IHtcbiAgICAgICAgc2V0LmZvckVhY2goKFtyZWYsIGlkXSkgPT4ge1xuICAgICAgICAgIGlmICghcmVmKSB3aW5kb3cuSmFtcm9jay5Db21wb25lbnRzLmltcG9ydChpZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZmV0Y2ggPSAodXJsLCBkYXRhLCBtZXRob2QsIGhlYWRlcnMpID0+IGZldGNoKHVybCwge1xuICAgICAgYm9keTogKFsnUE9TVCcsICdQVVQnLCAnUEFUQ0gnXS5pbmNsdWRlcyhtZXRob2QpICYmIGRhdGEpIHx8IHVuZGVmaW5lZCxcbiAgICAgIG1ldGhvZDogbWV0aG9kIHx8ICdHRVQnLFxuICAgICAgY3JlZGVudGlhbHM6ICdzYW1lLW9yaWdpbicsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIGFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnY2FjaGUtY29udHJvbCc6ICdtYXgtYWdlPTAsIG5vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlLCBwb3N0LWNoZWNrPTAsIHByZS1jaGVjaz0wJyxcbiAgICAgICAgJ3gtcmVxdWVzdGVkLXdpdGgnOiAnWE1MSHR0cFJlcXVlc3QnLFxuICAgICAgICAneC12ZXJzaW9uJzogdGhpcy52ZXJzaW9uLFxuICAgICAgICAnY3NyZi10b2tlbic6IHRoaXMuY3NyZl90b2tlbixcbiAgICAgICAgJ3JlcXVlc3QtdXVpZCc6IHRoaXMucmVxdWVzdF91dWlkLFxuICAgICAgICAuLi5oZWFkZXJzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGxldCBibG9jaztcbiAgICB0aGlzLnJlbG9hZCA9IChjYiwgcmVwbGF5KSA9PiB7XG4gICAgICBpZiAoYmxvY2sgfHwgdGhpcy5wYXVzZWQpIHJldHVybiBzZXRUaW1lb3V0KCgpID0+IGNiICYmIGNiKCksIDEyMCk7XG4gICAgICB3aW5kb3cuSmFtcm9jay5FdmVudEh1Yi5sb2FkVVJMKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQsXG4gICAgICAgIGxvY2F0aW9uLnBhdGhuYW1lLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIHJlcGxheSA/IHRoaXMucmVxdWVzdF9tZXRob2QgOiB1bmRlZmluZWQsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICBjYik7XG4gICAgfTtcblxuICAgIHRoaXMuYXR0cmlicyA9IG5vZGUgPT4gdG9BdHRycyhub2RlKTtcbiAgICB0aGlzLmNoaWxkcmVuID0gbm9kZSA9PiB0b05vZGVzKG5vZGUsIHRydWUpO1xuXG4gICAgdGhpcy5wYXVzZSA9ICgpID0+IHtcbiAgICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcbiAgICAgIGlmICh3aW5kb3cuSmFtcm9jay5GcmFnbWVudCkgd2luZG93LkphbXJvY2suRnJhZ21lbnQudGVhcmRvd24oKTtcbiAgICB9O1xuICAgIHRoaXMucmVzdW1lID0gKCkgPT4ge1xuICAgICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcblxuICAgICAgY2xlYXJUaW1lb3V0KGJsb2NrKTtcbiAgICAgIGJsb2NrID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGJsb2NrID0gbnVsbDtcbiAgICAgIH0sIDkwKTtcblxuICAgICAgaWYgKHdpbmRvdy5KYW1yb2NrLkZyYWdtZW50KSB3aW5kb3cuSmFtcm9jay5GcmFnbWVudC5zdWJzY3JpYmUoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5ydW50aW1lID0gYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCF3aW5kb3cuSmFtcm9jay5SdW50aW1lKSB7XG4gICAgICAgIGNvbnN0IHsgY3JlYXRlUmVuZGVyLCBjcmVhdGVGcmFnbWVudCB9ID0gYXdhaXQgaW1wb3J0KCcuL2VsZW1lbnRzLm1qcycpO1xuICAgICAgICBjb25zdCB7IHBhdGNoTm9kZSwgY3JlYXRlRWxlbWVudCwgcmVuZGVyVG9FbGVtZW50IH0gPSBjcmVhdGVSZW5kZXIoKTtcblxuICAgICAgICB3aW5kb3cuSmFtcm9jay5GcmFnbWVudCA9IGNyZWF0ZUZyYWdtZW50KHtcbiAgICAgICAgICBicm93c2VyOiB0aGlzLFxuICAgICAgICAgIHBhdGNoTm9kZSxcbiAgICAgICAgICBjcmVhdGVFbGVtZW50LFxuICAgICAgICB9KTtcblxuICAgICAgICB3aW5kb3cuSmFtcm9jay5SdW50aW1lID0ge1xuICAgICAgICAgIHJlbmRlclRvRWxlbWVudCxcbiAgICAgICAgICBjcmVhdGVFbGVtZW50LFxuICAgICAgICAgIHBhdGNoTm9kZSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgc3RhdGljIGluaXQoQ29tcG9uZW50cywgdmVyc2lvbiwgcHJlZml4LCBzdGF0ZSwgZGF0YSkge1xuICAgIGNvbnN0IGJyb3dzZXIgPSBuZXcgQnJvd3NlcihzdGF0ZSwgcHJlZml4LCB2ZXJzaW9uKTtcbiAgICBjb25zdCBzb2NrZXRzID0gbmV3IExpdmVTb2NrZXQoYnJvd3Nlcik7XG4gICAgY29uc3QgZXZlbnRzID0gbmV3IEV2ZW50SHViKHNvY2tldHMpO1xuXG4gICAgZXZlbnRzLnN0YXJ0KCk7XG4gICAgc29ja2V0cy5zdGFydCgpO1xuXG4gICAgd2luZG93LkphbXJvY2sgPSB7XG4gICAgICBCcm93c2VyOiBicm93c2VyLFxuICAgICAgRXZlbnRIdWI6IGV2ZW50cyxcbiAgICAgIExpdmVTb2NrZXQ6IHNvY2tldHMsXG4gICAgICBDb21wb25lbnRzOiBuZXcgQ29tcG9uZW50cyhicm93c2VyLCBwcmVmaXgsIGRhdGEpLFxuICAgIH07XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFFQSxJQUFNLFdBQVcsU0FBUyxhQUFhLFVBQVUsT0FBTztBQUVqRCxJQUFNLGFBQU4sTUFBaUI7QUFBQSxFQUN0QixZQUFZLFNBQVM7QUFDbkIsV0FBTyxlQUFlLE1BQU0sUUFBUTtBQUFBLE1BQ2xDLEtBQUssTUFBTSxRQUFRO0FBQUEsSUFDckIsQ0FBQztBQUVELFNBQUssUUFBUTtBQUNiLFNBQUssVUFBVTtBQUNmLFNBQUssV0FBVyxRQUFRO0FBQ3hCLFNBQUssV0FBVyxTQUFTLGdCQUFnQixRQUFRO0FBQ2pELFNBQUssV0FBVyxTQUFTLFNBQVMsTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDLEtBQUssU0FBUztBQUVsRSxZQUFRLE1BQU0sV0FBVyxLQUFLLE1BQU0sS0FBSyxRQUFRO0FBRWpELFFBQUksV0FBVztBQUNmLGFBQVMsUUFBUSxLQUFLO0FBQ3BCLGNBQVEsTUFBTSxTQUFTLEtBQUssUUFBUTtBQUNwQyxZQUFNLEtBQUs7QUFDWCxrQkFBWTtBQUNaLGFBQU87QUFBQSxJQUNUO0FBRUEsYUFBUyxTQUFTLFVBQVUsTUFBTTtBQUNoQyxVQUFJLFNBQVMsRUFBRztBQUNoQixlQUFTLElBQUk7QUFDYixpQkFBVyxNQUFNO0FBQ2YsaUJBQVM7QUFDVCxpQkFBUyxJQUFJO0FBQUEsTUFDZixHQUFHLElBQUk7QUFBQSxJQUNUO0FBRUEsUUFBSTtBQUNKLFNB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QUFTLEtBQUssT0FBUSxRQUFPLFdBQVcsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHO0FBQ2pFLGFBQU8sUUFBUSxTQUFTO0FBQUEsUUFBUSxTQUFTO0FBQUEsUUFDdkMsU0FBUztBQUFBLFFBQ1Q7QUFBQSxRQUNBLFNBQVMsS0FBSyxpQkFBaUI7QUFBQSxRQUMvQjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFBRTtBQUFBLElBQ047QUFFQSxTQUFLLFVBQVUsVUFBUSxHQUFRLElBQUk7QUFDbkMsU0FBSyxXQUFXLFVBQVEsR0FBUSxNQUFNLElBQUk7QUFFMUMsU0FBSyxRQUFRLE1BQU07QUFDakIsV0FBSyxTQUFTO0FBQ2QsVUFBSSxPQUFPLFFBQVEsU0FBVSxRQUFPLFFBQVEsU0FBUyxTQUFTO0FBQUEsSUFDaEU7QUFDQSxTQUFLLFNBQVMsTUFBTTtBQUNsQixXQUFLLFNBQVM7QUFFZCxtQkFBYSxLQUFLO0FBQ2xCLGNBQVEsV0FBVyxNQUFNO0FBQ3ZCLGdCQUFRO0FBQUEsTUFDVixHQUFHLEVBQUU7QUFFTCxVQUFJLE9BQU8sUUFBUSxTQUFVLFFBQU8sUUFBUSxTQUFTLFVBQVU7QUFBQSxJQUNqRTtBQUVBLFNBQUssVUFBVSxZQUFZO0FBQ3pCLFVBQUksQ0FBQyxPQUFPLFFBQVEsU0FBUztBQUMzQixjQUFNLEVBQUUsY0FBYyxlQUFlLElBQUksTUFBTSxPQUFPLHdCQUFnQjtBQUN0RSxjQUFNLEVBQUUsV0FBVyxlQUFlLGdCQUFnQixJQUFJLGFBQWE7QUFFbkUsZUFBTyxRQUFRLFdBQVcsZUFBZTtBQUFBLFVBQ3ZDLFNBQVM7QUFBQSxVQUNUO0FBQUEsVUFDQTtBQUFBLFFBQ0YsQ0FBQztBQUVELGVBQU8sUUFBUSxVQUFVO0FBQUEsVUFDdkI7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE9BQU8sS0FBSyxZQUFZLFNBQVMsUUFBUSxPQUFPLE1BQU07QUFDcEQsVUFBTSxVQUFVLElBQUksU0FBUSxPQUFPLFFBQVEsT0FBTztBQUNsRCxVQUFNLFVBQVUsSUFBSSxXQUFXLE9BQU87QUFDdEMsVUFBTSxTQUFTLElBQUksU0FBUyxPQUFPO0FBRW5DLFdBQU8sTUFBTTtBQUNiLFlBQVEsTUFBTTtBQUVkLFdBQU8sVUFBVTtBQUFBLE1BQ2YsU0FBUztBQUFBLE1BQ1QsVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLE1BQ1osWUFBWSxJQUFJLFdBQVcsU0FBUyxRQUFRLElBQUk7QUFBQSxJQUNsRDtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsib2siXQp9Cg==
