import {
  findNodes
} from "./chunk-S3BAYXEE.js";

// src/client/submit.mjs
function handleCleanup(el) {
  if ("reset" in el.dataset) el.value = null;
}
async function handleSubmit(e) {
  if (e.target.checkValidity()) {
    const el = document.activeElement;
    const data = new FormData(e.target);
    const method = el.form && (el.form.elements._method ? el.form.elements._method && el.form.elements._method.value || "POST" : el.form.method.toUpperCase()) || "GET";
    if (el && el.form && el.name && (el.tagName === "BUTTON" || el.type === "submit")) {
      data.set(el.name, el.value);
    }
    let success;
    try {
      if ("trigger" in e.target.dataset) {
        const source = findNodes("source", e.target);
        await this.sockets.trigger(e, "form", source ? source.dataset.source : null, e.target, data);
      } else {
        const url = e.target.action;
        const headers = { "request-type": "bind" };
        success = await this.loadURL(e.target, url, data, method, headers);
      }
    } finally {
      if (success) {
        for (const node of e.target.elements) handleCleanup(node);
      }
    }
  }
}

export {
  handleCleanup,
  handleSubmit
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NsaWVudC9zdWJtaXQubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBmaW5kTm9kZXMgfSBmcm9tICcuLi91dGlscy9jbGllbnQubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGhhbmRsZUNsZWFudXAoZWwpIHtcbiAgaWYgKCdyZXNldCcgaW4gZWwuZGF0YXNldCkgZWwudmFsdWUgPSBudWxsO1xufVxuXG4vLyBGSVhNRTogaGFuZGxlIGxvZ2ljIHdpdGggYmluZGluZ3MgYXMgd2VsbD9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZSkge1xuICBpZiAoZS50YXJnZXQuY2hlY2tWYWxpZGl0eSgpKSB7XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgRm9ybURhdGEoZS50YXJnZXQpO1xuXG4gICAgY29uc3QgbWV0aG9kID0gKGVsLmZvcm0gJiYgKGVsLmZvcm0uZWxlbWVudHMuX21ldGhvZFxuICAgICAgPyAoKGVsLmZvcm0uZWxlbWVudHMuX21ldGhvZCAmJiBlbC5mb3JtLmVsZW1lbnRzLl9tZXRob2QudmFsdWUpIHx8ICdQT1NUJylcbiAgICAgIDogZWwuZm9ybS5tZXRob2QudG9VcHBlckNhc2UoKSkpXG4gICAgICB8fCAnR0VUJztcblxuICAgIGlmIChlbCAmJiBlbC5mb3JtICYmIGVsLm5hbWUgJiYgKGVsLnRhZ05hbWUgPT09ICdCVVRUT04nIHx8IGVsLnR5cGUgPT09ICdzdWJtaXQnKSkge1xuICAgICAgZGF0YS5zZXQoZWwubmFtZSwgZWwudmFsdWUpO1xuICAgIH1cblxuICAgIGxldCBzdWNjZXNzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoJ3RyaWdnZXInIGluIGUudGFyZ2V0LmRhdGFzZXQpIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gZmluZE5vZGVzKCdzb3VyY2UnLCBlLnRhcmdldCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zb2NrZXRzLnRyaWdnZXIoZSwgJ2Zvcm0nLCBzb3VyY2UgPyBzb3VyY2UuZGF0YXNldC5zb3VyY2UgOiBudWxsLCBlLnRhcmdldCwgZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB1cmwgPSBlLnRhcmdldC5hY3Rpb247XG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7ICdyZXF1ZXN0LXR5cGUnOiAnYmluZCcgfTtcblxuICAgICAgICBzdWNjZXNzID0gYXdhaXQgdGhpcy5sb2FkVVJMKGUudGFyZ2V0LCB1cmwsIGRhdGEsIG1ldGhvZCwgaGVhZGVycyk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlLnRhcmdldC5lbGVtZW50cykgaGFuZGxlQ2xlYW51cChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7O0FBRU8sU0FBUyxjQUFjLElBQUk7QUFDaEMsTUFBSSxXQUFXLEdBQUcsUUFBUyxJQUFHLFFBQVE7QUFDeEM7QUFHQSxlQUFzQixhQUFhLEdBQUc7QUFDcEMsTUFBSSxFQUFFLE9BQU8sY0FBYyxHQUFHO0FBQzVCLFVBQU0sS0FBSyxTQUFTO0FBQ3BCLFVBQU0sT0FBTyxJQUFJLFNBQVMsRUFBRSxNQUFNO0FBRWxDLFVBQU0sU0FBVSxHQUFHLFNBQVMsR0FBRyxLQUFLLFNBQVMsVUFDdkMsR0FBRyxLQUFLLFNBQVMsV0FBVyxHQUFHLEtBQUssU0FBUyxRQUFRLFNBQVUsU0FDakUsR0FBRyxLQUFLLE9BQU8sWUFBWSxNQUMxQjtBQUVMLFFBQUksTUFBTSxHQUFHLFFBQVEsR0FBRyxTQUFTLEdBQUcsWUFBWSxZQUFZLEdBQUcsU0FBUyxXQUFXO0FBQ2pGLFdBQUssSUFBSSxHQUFHLE1BQU0sR0FBRyxLQUFLO0FBQUEsSUFDNUI7QUFFQSxRQUFJO0FBQ0osUUFBSTtBQUNGLFVBQUksYUFBYSxFQUFFLE9BQU8sU0FBUztBQUNqQyxjQUFNLFNBQVMsVUFBVSxVQUFVLEVBQUUsTUFBTTtBQUUzQyxjQUFNLEtBQUssUUFBUSxRQUFRLEdBQUcsUUFBUSxTQUFTLE9BQU8sUUFBUSxTQUFTLE1BQU0sRUFBRSxRQUFRLElBQUk7QUFBQSxNQUM3RixPQUFPO0FBQ0wsY0FBTSxNQUFNLEVBQUUsT0FBTztBQUNyQixjQUFNLFVBQVUsRUFBRSxnQkFBZ0IsT0FBTztBQUV6QyxrQkFBVSxNQUFNLEtBQUssUUFBUSxFQUFFLFFBQVEsS0FBSyxNQUFNLFFBQVEsT0FBTztBQUFBLE1BQ25FO0FBQUEsSUFDRixVQUFFO0FBQ0EsVUFBSSxTQUFTO0FBQ1gsbUJBQVcsUUFBUSxFQUFFLE9BQU8sU0FBVSxlQUFjLElBQUk7QUFBQSxNQUMxRDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==
