const { JS_RUNTIME } = require('./reloader');

function getMetaRedirect(ctx, enabled) {
  const baseUrl = ctx.req.originalUrl || ctx.req.url;
  const cleanUrl = baseUrl.replace(/[&?]noscript(?:=[^&?=]*?)?/, '');

  let out = `\n<script>
  if (location.search.includes('noscript')) location.href = '${cleanUrl}';
</script>`;

  if (enabled) {
    out += `\n<noscript>
  <meta http-equiv="refresh" content="0; url=${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}noscript" />
</noscript>`;
  }
  return out;
}

module.exports = (ctx, reload) => {
  let payload = '';
  if (!process.headless) {
    const RUNTIME_SCRIPT = JS_RUNTIME(ctx.req.uuid);

    if ('noscript' in ctx.query_params) {
      payload += getMetaRedirect(ctx) + RUNTIME_SCRIPT + reload;
    } else {
      payload += getMetaRedirect(ctx, true) + RUNTIME_SCRIPT + reload;
    }
  }
  return payload;
};
