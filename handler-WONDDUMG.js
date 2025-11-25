import {
  handleCleanup
} from "./chunk-72YWEHBK.js";
import {
  findNodes
} from "./chunk-OPYNACR3.js";

// src/client/handler.mjs
function serializeBindings(node, payload, bindings, targetForm) {
  if (targetForm && targetForm.contains(node)) return;
  if (bindings.has(node)) return;
  bindings.add(node);
  const keys = Object.keys(node.dataset);
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].indexOf("bind:") === 0) {
      const param = node.dataset[keys[i]];
      const prop = keys[i].substr(5);
      if (node.type === "file") {
        for (const file of node.files) {
          payload.append(param, file, file.name);
        }
      } else if (node[prop] !== false) {
        payload.append(param, node[prop]);
      }
      break;
    }
  }
}
function handleEvent(e, kind) {
  const throttle = findNodes("throttle", e.target) || null;
  if (throttle) {
    if (throttle._locked && e.type !== "change") return;
    throttle._locked = setTimeout(() => {
      throttle._locked = null;
    }, +throttle.dataset.throttle || 120);
  }
  if ("put" in e.target.dataset || "post" in e.target.dataset || "patch" in e.target.dataset || "delete" in e.target.dataset) {
    const _location = e.target.href || e.target.dataset.put || e.target.dataset.post || e.target.dataset.patch || e.target.dataset.delete;
    let method = "GET";
    if (e.target.dataset.put) method = "PUT";
    if (e.target.dataset.post) method = "POST";
    if (e.target.dataset.patch) method = "PATCH";
    if (e.target.dataset.delete) method = "DELETE";
    return this.loadURL(e.target, null, null, method, null, _location);
  }
  if (e.target.tagName === "A") {
    return this.loadURL(e.target, e.target.dataset.url, null, "GET", {
      "request-type": "link"
    }, e.target.href);
  }
  const keys = Object.keys(e.target.dataset);
  const bindings = /* @__PURE__ */ new Set();
  let payload;
  let headers;
  for (let i = 0; i < keys.length; i += 1) {
    if (kind === keys[i].substr(3).toLowerCase()) {
      headers = { "request-call": e.target.value, "request-type": "rpc" };
      break;
    }
    if (keys[i].indexOf("bind:") === 0) {
      payload = payload || new FormData(e.target.form || void 0);
      payload.delete("_method");
      break;
    }
  }
  if (payload) {
    serializeBindings(e.target, payload, bindings, e.target.form);
  }
  if (payload || headers) {
    const source = findNodes("source", e.target);
    const trigger = findNodes("trigger", e.target);
    if (source) {
      headers = headers || {};
      headers["request-from"] = source.dataset.source;
      if (e.target.dataset.key) headers["request-key"] = e.target.dataset.key;
    }
    if (!payload && e.target.form) {
      payload = new FormData(e.target.form);
    }
    const nodes = document.querySelectorAll("[data-binding]");
    nodes.forEach((node) => {
      if (bindings.has(node)) return;
      payload = payload || new FormData();
      serializeBindings(node, payload, bindings, e.target.form);
    });
    bindings.forEach(handleCleanup);
    if (trigger) {
      return this.sockets.trigger(e, kind, source ? source.dataset.source : null, trigger, payload);
    }
    const form = e.target.tagName === "FORM" || e.target.form ? e.target.form || e.target : null;
    const method = form && (form.elements._method ? form.elements._method && form.elements._method.value || "POST" : form.method.toUpperCase()) || "GET";
    return this.loadURL(e.target, form && form.action, payload, method, {
      "request-type": "bind",
      ...headers
    });
  }
}
export {
  handleEvent,
  serializeBindings
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaWVudC9oYW5kbGVyLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgaGFuZGxlQ2xlYW51cCB9IGZyb20gJy4vc3VibWl0Lm1qcyc7XG5pbXBvcnQgeyBmaW5kTm9kZXMgfSBmcm9tICcuLi91dGlscy9jbGllbnQubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUJpbmRpbmdzKG5vZGUsIHBheWxvYWQsIGJpbmRpbmdzLCB0YXJnZXRGb3JtKSB7XG4gIGlmICh0YXJnZXRGb3JtICYmIHRhcmdldEZvcm0uY29udGFpbnMobm9kZSkpIHJldHVybjtcbiAgaWYgKGJpbmRpbmdzLmhhcyhub2RlKSkgcmV0dXJuO1xuICBiaW5kaW5ncy5hZGQobm9kZSk7XG5cbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG5vZGUuZGF0YXNldCk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKGtleXNbaV0uaW5kZXhPZignYmluZDonKSA9PT0gMCkge1xuICAgICAgY29uc3QgcGFyYW0gPSBub2RlLmRhdGFzZXRba2V5c1tpXV07XG4gICAgICBjb25zdCBwcm9wID0ga2V5c1tpXS5zdWJzdHIoNSk7XG5cbiAgICAgIGlmIChub2RlLnR5cGUgPT09ICdmaWxlJykge1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2Ygbm9kZS5maWxlcykge1xuICAgICAgICAgIHBheWxvYWQuYXBwZW5kKHBhcmFtLCBmaWxlLCBmaWxlLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGVbcHJvcF0gIT09IGZhbHNlKSB7XG4gICAgICAgIHBheWxvYWQuYXBwZW5kKHBhcmFtLCBub2RlW3Byb3BdKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlRXZlbnQoZSwga2luZCkge1xuICBjb25zdCB0aHJvdHRsZSA9IGZpbmROb2RlcygndGhyb3R0bGUnLCBlLnRhcmdldCkgfHwgbnVsbDtcblxuICBpZiAodGhyb3R0bGUpIHtcbiAgICBpZiAodGhyb3R0bGUuX2xvY2tlZCAmJiBlLnR5cGUgIT09ICdjaGFuZ2UnKSByZXR1cm47XG4gICAgdGhyb3R0bGUuX2xvY2tlZCA9IHNldFRpbWVvdXQoKCkgPT4geyB0aHJvdHRsZS5fbG9ja2VkID0gbnVsbDsgfSwgK3Rocm90dGxlLmRhdGFzZXQudGhyb3R0bGUgfHwgMTIwKTtcbiAgfVxuXG4gIGlmIChcbiAgICAncHV0JyBpbiBlLnRhcmdldC5kYXRhc2V0XG4gICAgfHwgJ3Bvc3QnIGluIGUudGFyZ2V0LmRhdGFzZXRcbiAgICB8fCAncGF0Y2gnIGluIGUudGFyZ2V0LmRhdGFzZXRcbiAgICB8fCAnZGVsZXRlJyBpbiBlLnRhcmdldC5kYXRhc2V0XG4gICkge1xuICAgIGNvbnN0IF9sb2NhdGlvbiA9IGUudGFyZ2V0LmhyZWZcbiAgICAgIHx8IGUudGFyZ2V0LmRhdGFzZXQucHV0XG4gICAgICB8fCBlLnRhcmdldC5kYXRhc2V0LnBvc3RcbiAgICAgIHx8IGUudGFyZ2V0LmRhdGFzZXQucGF0Y2hcbiAgICAgIHx8IGUudGFyZ2V0LmRhdGFzZXQuZGVsZXRlO1xuXG4gICAgbGV0IG1ldGhvZCA9ICdHRVQnO1xuICAgIGlmIChlLnRhcmdldC5kYXRhc2V0LnB1dCkgbWV0aG9kID0gJ1BVVCc7XG4gICAgaWYgKGUudGFyZ2V0LmRhdGFzZXQucG9zdCkgbWV0aG9kID0gJ1BPU1QnO1xuICAgIGlmIChlLnRhcmdldC5kYXRhc2V0LnBhdGNoKSBtZXRob2QgPSAnUEFUQ0gnO1xuICAgIGlmIChlLnRhcmdldC5kYXRhc2V0LmRlbGV0ZSkgbWV0aG9kID0gJ0RFTEVURSc7XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkVVJMKGUudGFyZ2V0LCBudWxsLCBudWxsLCBtZXRob2QsIG51bGwsIF9sb2NhdGlvbik7XG4gIH1cblxuICBpZiAoZS50YXJnZXQudGFnTmFtZSA9PT0gJ0EnKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZFVSTChlLnRhcmdldCwgZS50YXJnZXQuZGF0YXNldC51cmwsIG51bGwsICdHRVQnLCB7XG4gICAgICAncmVxdWVzdC10eXBlJzogJ2xpbmsnLFxuICAgIH0sIGUudGFyZ2V0LmhyZWYpO1xuICB9XG5cbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGUudGFyZ2V0LmRhdGFzZXQpO1xuICBjb25zdCBiaW5kaW5ncyA9IG5ldyBTZXQoKTtcblxuICBsZXQgcGF5bG9hZDtcbiAgbGV0IGhlYWRlcnM7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChraW5kID09PSBrZXlzW2ldLnN1YnN0cigzKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICBoZWFkZXJzID0geyAncmVxdWVzdC1jYWxsJzogZS50YXJnZXQudmFsdWUsICdyZXF1ZXN0LXR5cGUnOiAncnBjJyB9O1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGtleXNbaV0uaW5kZXhPZignYmluZDonKSA9PT0gMCkge1xuICAgICAgcGF5bG9hZCA9IHBheWxvYWQgfHwgbmV3IEZvcm1EYXRhKGUudGFyZ2V0LmZvcm0gfHwgdW5kZWZpbmVkKTtcbiAgICAgIHBheWxvYWQuZGVsZXRlKCdfbWV0aG9kJyk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAocGF5bG9hZCkge1xuICAgIHNlcmlhbGl6ZUJpbmRpbmdzKGUudGFyZ2V0LCBwYXlsb2FkLCBiaW5kaW5ncywgZS50YXJnZXQuZm9ybSk7XG4gIH1cblxuICBpZiAocGF5bG9hZCB8fCBoZWFkZXJzKSB7XG4gICAgY29uc3Qgc291cmNlID0gZmluZE5vZGVzKCdzb3VyY2UnLCBlLnRhcmdldCk7XG4gICAgY29uc3QgdHJpZ2dlciA9IGZpbmROb2RlcygndHJpZ2dlcicsIGUudGFyZ2V0KTtcblxuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgIGhlYWRlcnMgPSBoZWFkZXJzIHx8IHt9O1xuICAgICAgaGVhZGVyc1sncmVxdWVzdC1mcm9tJ10gPSBzb3VyY2UuZGF0YXNldC5zb3VyY2U7XG4gICAgICBpZiAoZS50YXJnZXQuZGF0YXNldC5rZXkpIGhlYWRlcnNbJ3JlcXVlc3Qta2V5J10gPSBlLnRhcmdldC5kYXRhc2V0LmtleTtcbiAgICB9XG5cbiAgICBpZiAoIXBheWxvYWQgJiYgZS50YXJnZXQuZm9ybSkge1xuICAgICAgcGF5bG9hZCA9IG5ldyBGb3JtRGF0YShlLnRhcmdldC5mb3JtKTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWJpbmRpbmddJyk7XG5cbiAgICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgaWYgKGJpbmRpbmdzLmhhcyhub2RlKSkgcmV0dXJuO1xuICAgICAgcGF5bG9hZCA9IHBheWxvYWQgfHwgbmV3IEZvcm1EYXRhKCk7XG4gICAgICBzZXJpYWxpemVCaW5kaW5ncyhub2RlLCBwYXlsb2FkLCBiaW5kaW5ncywgZS50YXJnZXQuZm9ybSk7XG4gICAgfSk7XG5cbiAgICBiaW5kaW5ncy5mb3JFYWNoKGhhbmRsZUNsZWFudXApO1xuXG4gICAgaWYgKHRyaWdnZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLnNvY2tldHMudHJpZ2dlcihlLCBraW5kLCBzb3VyY2UgPyBzb3VyY2UuZGF0YXNldC5zb3VyY2UgOiBudWxsLCB0cmlnZ2VyLCBwYXlsb2FkKTtcbiAgICB9XG5cbiAgICBjb25zdCBmb3JtID0gZS50YXJnZXQudGFnTmFtZSA9PT0gJ0ZPUk0nIHx8IGUudGFyZ2V0LmZvcm1cbiAgICAgID8gKGUudGFyZ2V0LmZvcm0gfHwgZS50YXJnZXQpXG4gICAgICA6IG51bGw7XG5cbiAgICBjb25zdCBtZXRob2QgPSAoZm9ybSAmJiAoZm9ybS5lbGVtZW50cy5fbWV0aG9kXG4gICAgICA/ICgoZm9ybS5lbGVtZW50cy5fbWV0aG9kICYmIGZvcm0uZWxlbWVudHMuX21ldGhvZC52YWx1ZSkgfHwgJ1BPU1QnKVxuICAgICAgOiBmb3JtLm1ldGhvZC50b1VwcGVyQ2FzZSgpKSlcbiAgICAgIHx8ICdHRVQnO1xuXG4gICAgcmV0dXJuIHRoaXMubG9hZFVSTChlLnRhcmdldCwgZm9ybSAmJiBmb3JtLmFjdGlvbiwgcGF5bG9hZCwgbWV0aG9kLCB7XG4gICAgICAncmVxdWVzdC10eXBlJzogJ2JpbmQnLFxuICAgICAgLi4uaGVhZGVycyxcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFHTyxTQUFTLGtCQUFrQixNQUFNLFNBQVMsVUFBVSxZQUFZO0FBQ3JFLE1BQUksY0FBYyxXQUFXLFNBQVMsSUFBSSxFQUFHO0FBQzdDLE1BQUksU0FBUyxJQUFJLElBQUksRUFBRztBQUN4QixXQUFTLElBQUksSUFBSTtBQUVqQixRQUFNLE9BQU8sT0FBTyxLQUFLLEtBQUssT0FBTztBQUVyQyxXQUFTLElBQUksR0FBRyxJQUFJLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDdkMsUUFBSSxLQUFLLENBQUMsRUFBRSxRQUFRLE9BQU8sTUFBTSxHQUFHO0FBQ2xDLFlBQU0sUUFBUSxLQUFLLFFBQVEsS0FBSyxDQUFDLENBQUM7QUFDbEMsWUFBTSxPQUFPLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQztBQUU3QixVQUFJLEtBQUssU0FBUyxRQUFRO0FBQ3hCLG1CQUFXLFFBQVEsS0FBSyxPQUFPO0FBQzdCLGtCQUFRLE9BQU8sT0FBTyxNQUFNLEtBQUssSUFBSTtBQUFBLFFBQ3ZDO0FBQUEsTUFDRixXQUFXLEtBQUssSUFBSSxNQUFNLE9BQU87QUFDL0IsZ0JBQVEsT0FBTyxPQUFPLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDbEM7QUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFTyxTQUFTLFlBQVksR0FBRyxNQUFNO0FBQ25DLFFBQU0sV0FBVyxVQUFVLFlBQVksRUFBRSxNQUFNLEtBQUs7QUFFcEQsTUFBSSxVQUFVO0FBQ1osUUFBSSxTQUFTLFdBQVcs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
