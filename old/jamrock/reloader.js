module.exports = {
  JS_RUNTIME: uuid => `<script src="/jamrock-runtime.js?${process.env.PORT || 8080}/${uuid || '*'}"></script>`,
  LIVE_RELOAD: '<script>if ("Jamrock" in window) Jamrock.Browser.live();</script>',
};
