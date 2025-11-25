import {
  decode,
  sleep,
  spaNavigate,
  updatePage
} from "./chunk-OPYNACR3.js";

// src/client/request.mjs
function hasHTML(value) {
  return /<\w/.test(value);
}
function redrawPage(html) {
  html = html.replace(/<script src="[^<>]+@runtime[^<>]+"><\/script>/, "");
  html = html.replace(/<script type=importmap>[^<>]+<\/script>/, "");
  document.open();
  document.write(html);
  document.close();
}
function doRequest(url, data, method, headers) {
  let multipart;
  if (data instanceof FormData) {
    data.forEach((value) => {
      if (value instanceof File) multipart = true;
    });
  }
  url = url || location.pathname;
  data = data && !multipart ? new URLSearchParams(data) : data;
  if (!method || method === "GET") {
    if (data) url += `?${data}`;
    updatePage("", url);
  }
  return this.browser.fetch(url, data, method, {
    ...data && !multipart ? { "content-type": "application/x-www-form-urlencoded" } : null,
    ...headers
  }).then((resp) => {
    this.browser.csrf_token = resp.headers.get("x-csrf") || this.browser.csrf_token;
    this.browser.request_failure = resp.status === 404 || resp.status >= 500;
    this.browser.request_success = resp.status > 199 || resp.status < 300;
    if (resp.status === 204) return;
    return resp.text().then((body) => {
      if (resp.redirected && resp.url.includes(location.host)) {
        updatePage("", resp.url.replace(location.origin, ""));
      }
      return body;
    });
  }).catch((e) => {
    e.message = `Could not reach '${method || "GET"} ${url.replace(location.origin, "")}' (${e.message})`;
    throw e;
  });
}
function loadPage({ el, wait, target, fragment }, url, data, method, _headers, _location, _callback) {
  const active = document.activeElement;
  const parent = el && el.form || el;
  if (!(url || _location)) {
    console.log({ active, data, method });
    throw new Error("Missed location");
  }
  if (parent) {
    parent.classList.add("loading");
  }
  _headers = _headers || {};
  const [prefix, suffix] = this.browser.request_uuid.split(".");
  _headers["request-uuid"] = [parseInt(prefix, 10) + 1, suffix].join(".");
  if (fragment) _headers["request-ref"] = fragment.dataset.fragment;
  window.Jamrock.LiveSocket.next(_headers["request-uuid"]);
  const ms = wait ? wait.dataset.wait : null;
  const anchor = (url || _location).split("#").pop();
  return doRequest.call(this, url || _location, data, method, _headers).then((body) => sleep(ms).then(() => {
    if (!body) return _callback && _callback(target, null);
    if (!(body[0] === "{" && body.substr(-1) === "}")) {
      if (hasHTML(body)) {
        spaNavigate(() => redrawPage(body));
      } else if (body) {
        throw new TypeError(body);
      }
      return _callback && _callback(target, body);
    }
    console.log("[PAGE]", url || _location);
    this.browser.sync(JSON.parse(decode(body)), spaNavigate, anchor).then(() => _callback && _callback(target, body));
  })).then(() => {
    if (parent && method === "GET") {
      updatePage("", _location);
    }
  }).catch((e) => {
    if (hasHTML(e.message)) return redrawPage(e.message);
    this.browser.warn(e, "Request Failure");
  }).then(() => {
    if (parent) {
      parent.classList.remove("loading");
      if (active) active.focus();
    }
    return this.browser.request_success;
  });
}
export {
  doRequest,
  hasHTML,
  loadPage,
  redrawPage
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaWVudC9yZXF1ZXN0Lm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgc2xlZXAsIGRlY29kZSwgdXBkYXRlUGFnZSwgc3BhTmF2aWdhdGUgfSBmcm9tICcuLi91dGlscy9jbGllbnQubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0hUTUwodmFsdWUpIHtcbiAgcmV0dXJuIC88XFx3Ly50ZXN0KHZhbHVlKTtcbn1cblxuLy8gRklYTUU6IHRoaXMgZG9lcyBub3QgcGxheXMgd2VsbCBpbiB3ZWJjb250YWluZXJzLi4uXG5leHBvcnQgZnVuY3Rpb24gcmVkcmF3UGFnZShodG1sKSB7XG4gIGh0bWwgPSBodG1sLnJlcGxhY2UoLzxzY3JpcHQgc3JjPVwiW148Pl0rQHJ1bnRpbWVbXjw+XStcIj48XFwvc2NyaXB0Pi8sICcnKTtcbiAgaHRtbCA9IGh0bWwucmVwbGFjZSgvPHNjcmlwdCB0eXBlPWltcG9ydG1hcD5bXjw+XSs8XFwvc2NyaXB0Pi8sICcnKTtcblxuICBkb2N1bWVudC5vcGVuKCk7XG4gIGRvY3VtZW50LndyaXRlKGh0bWwpO1xuICBkb2N1bWVudC5jbG9zZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9SZXF1ZXN0KHVybCwgZGF0YSwgbWV0aG9kLCBoZWFkZXJzKSB7XG4gIGxldCBtdWx0aXBhcnQ7XG4gIGlmIChkYXRhIGluc3RhbmNlb2YgRm9ybURhdGEpIHtcbiAgICBkYXRhLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRmlsZSkgbXVsdGlwYXJ0ID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIHVybCA9IHVybCB8fCBsb2NhdGlvbi5wYXRobmFtZTtcbiAgZGF0YSA9IGRhdGEgJiYgIW11bHRpcGFydCA/IG5ldyBVUkxTZWFyY2hQYXJhbXMoZGF0YSkgOiBkYXRhO1xuXG4gIGlmICghbWV0aG9kIHx8IG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICBpZiAoZGF0YSkgdXJsICs9IGA/JHtkYXRhfWA7XG4gICAgdXBkYXRlUGFnZSgnJywgdXJsKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmJyb3dzZXIuZmV0Y2godXJsLCBkYXRhLCBtZXRob2QsIHtcbiAgICAuLi4oZGF0YSAmJiAhbXVsdGlwYXJ0ID8geyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgfSA6IG51bGwpLFxuICAgIC4uLmhlYWRlcnMsXG4gIH0pLnRoZW4ocmVzcCA9PiB7XG4gICAgdGhpcy5icm93c2VyLmNzcmZfdG9rZW4gPSByZXNwLmhlYWRlcnMuZ2V0KCd4LWNzcmYnKSB8fCB0aGlzLmJyb3dzZXIuY3NyZl90b2tlbjtcbiAgICB0aGlzLmJyb3dzZXIucmVxdWVzdF9mYWlsdXJlID0gcmVzcC5zdGF0dXMgPT09IDQwNCB8fCByZXNwLnN0YXR1cyA+PSA1MDA7XG4gICAgdGhpcy5icm93c2VyLnJlcXVlc3Rfc3VjY2VzcyA9IHJlc3Auc3RhdHVzID4gMTk5IHx8IHJlc3Auc3RhdHVzIDwgMzAwO1xuXG4gICAgaWYgKHJlc3Auc3RhdHVzID09PSAyMDQpIHJldHVybjtcbiAgICByZXR1cm4gcmVzcC50ZXh0KCkudGhlbihib2R5ID0+IHtcbiAgICAgIGlmIChyZXNwLnJlZGlyZWN0ZWQgJiYgcmVzcC51cmwuaW5jbHVkZXMobG9jYXRpb24uaG9zdCkpIHtcbiAgICAgICAgdXBkYXRlUGFnZSgnJywgcmVzcC51cmwucmVwbGFjZShsb2NhdGlvbi5vcmlnaW4sICcnKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYm9keTtcbiAgICB9KTtcbiAgfSkuY2F0Y2goZSA9PiB7XG4gICAgZS5tZXNzYWdlID0gYENvdWxkIG5vdCByZWFjaCAnJHttZXRob2QgfHwgJ0dFVCd9ICR7XG4gICAgICB1cmwucmVwbGFjZShsb2NhdGlvbi5vcmlnaW4sICcnKVxuICAgIH0nICgke2UubWVzc2FnZX0pYDtcbiAgICB0aHJvdyBlO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRQYWdlKHsgZWwsIHdhaXQsIHRhcmdldCwgZnJhZ21lbnQgfSwgdXJsLCBkYXRhLCBtZXRob2QsIF9oZWFkZXJzLCBfbG9jYXRpb24sIF9jYWxsYmFjaykge1xuICBjb25zdCBhY3RpdmUgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICBjb25zdCBwYXJlbnQgPSAoZWwgJiYgZWwuZm9ybSkgfHwgZWw7XG5cbiAgaWYgKCEodXJsIHx8IF9sb2NhdGlvbikpIHtcbiAgICBjb25zb2xlLmxvZyh7IGFjdGl2ZSwgZGF0YSwgbWV0aG9kIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2VkIGxvY2F0aW9uJyk7XG4gIH1cblxuICBpZiAocGFyZW50KSB7XG4gICAgcGFyZW50LmNsYXNzTGlzdC5hZGQoJ2xvYWRpbmcnKTtcbiAgfVxuXG4gIF9oZWFkZXJzID0gX2hlYWRlcnMgfHwge307XG5cbiAgY29uc3QgW3ByZWZpeCwgc3VmZml4XSA9IHRoaXMuYnJvd3Nlci5yZXF1ZXN0X3V1aWQuc3BsaXQoJy4nKTtcblxuICBfaGVhZGVyc1sncmVxdWVzdC11dWlkJ10gPSBbcGFyc2VJbnQocHJlZml4LCAxMCkgKyAxLCBzdWZmaXhdLmpvaW4oJy4nKTtcblxuICBpZiAoZnJhZ21lbnQpIF9oZWFkZXJzWydyZXF1ZXN0LXJlZiddID0gZnJhZ21lbnQuZGF0YXNldC5mcmFnbWVudDtcblxuICB3aW5kb3cuSmFtcm9jay5MaXZlU29ja2V0Lm5leHQoX2hlYWRlcnNbJ3JlcXVlc3QtdXVpZCddKTtcblxuICBjb25zdCBtcyA9IHdhaXQgPyB3YWl0LmRhdGFzZXQud2FpdCA6IG51bGw7XG4gIGNvbnN0IGFuY2hvciA9ICh1cmwgfHwgX2xvY2F0aW9uKS5zcGxpdCgnIycpLnBvcCgpO1xuXG4gIHJldHVybiBkb1JlcXVlc3QuY2FsbCh0aGlzLCB1cmwgfHwgX2xvY2F0aW9uLCBkYXRhLCBtZXRob2QsIF9oZWFkZXJzKS50aGVuKGJvZHkgPT4gc2xlZXAobXMpLnRoZW4oKCkgPT4ge1xuICAgIGlmICghYm9keSkgcmV0dXJuIF9jYWxsYmFjayAmJiBfY2FsbGJhY2sodGFyZ2V0LCBudWxsKTtcbiAgICBpZiAoIShib2R5WzBdID09PSAneycgJiYgYm9keS5zdWJzdHIoLTEpID09PSAnfScpKSB7XG4gICAgICBpZiAoaGFzSFRNTChib2R5KSkge1xuICAgICAgICBzcGFOYXZpZ2F0ZSgoKSA9PiByZWRyYXdQYWdlKGJvZHkpKTtcbiAgICAgIH0gZWxzZSBpZiAoYm9keSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGJvZHkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIF9jYWxsYmFjayAmJiBfY2FsbGJhY2sodGFyZ2V0LCBib2R5KTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnW1BBR0VdJywgdXJsIHx8IF9sb2NhdGlvbik7XG4gICAgdGhpcy5icm93c2VyLnN5bmMoSlNPTi5wYXJzZShkZWNvZGUoYm9keSkpLCBzcGFOYXZpZ2F0ZSwgYW5jaG9yKVxuICAgICAgLnRoZW4oKCkgPT4gX2NhbGxiYWNrICYmIF9jYWxsYmFjayh0YXJnZXQsIGJvZHkpKTtcbiAgfSkpLnRoZW4oKCkgPT4ge1xuICAgIGlmIChwYXJlbnQgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgICAgdXBkYXRlUGFnZSgnJywgX2xvY2F0aW9uKTtcbiAgICB9XG4gIH0pLmNhdGNoKGUgPT4ge1xuICAgIGlmIChoYXNIVE1MKGUubWVzc2FnZSkpIHJldHVybiByZWRyYXdQYWdlKGUubWVzc2FnZSk7XG4gICAgdGhpcy5icm93c2VyLndhcm4oZSwgJ1JlcXVlc3QgRmFpbHVyZScpO1xuICB9KS50aGVuKCgpID0+IHtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBwYXJlbnQuY2xhc3NMaXN0LnJlbW92ZSgnbG9hZGluZycpO1xuICAgICAgaWYgKGFjdGl2ZSkgYWN0aXZlLmZvY3VzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmJyb3dzZXIucmVxdWVzdF9zdWNjZXNzO1xuICB9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
