// build/examples/components/client/clock.generated.mjs
var __handler = async ($$props, __loader, self) => {
  const { useState, useEffect } = await __loader("jamrock");
  async function __context2(__default = {}) {
    const [now, setTime] = useState(Date.now());
    useEffect(() => {
      const timer = setInterval(() => {
        setTime(Date.now());
      }, 1e3);
      return () => clearInterval(timer);
    }, []);
    return { __default, __scope: { now, setTime } };
  }
  const __runtime = await __loader("jamrock");
  const __self = __runtime.wrapComponent("examples/components/client/clock.html", __context2, __template);
  return { __self, __context: __context2 };
};
var __routes = [];
var __snippets = {};
var __fragments = {};
var __scripts = [];
var __styles = [["examples/components/client/clock.css", null]];
var __media = [];
var __context = "client";
var __doctype = async ($$, { now, setTime, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __metadata = async ($$, { now, setTime, ...$$props }) => [
  /*<![CDATA[*/
  /*]]>*/
];
var __attributes = async ($$, { now, setTime, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __template = async ($$, { now, setTime, ...$$props }) => [
  /*<![CDATA[*/
  /*!#14:1*/
  $$.$(new Date(now).toISOString().substr(11, 8))
  /*]]>*/
];
var __exported = [];
var __functions = {};
var __src = "examples/components/client/clock.html";
var __dest = "build/examples/components/client/clock.generated.mjs";
for (const [, fn] of Object.entries(__functions)) fn.$ = __src;
export {
  __attributes,
  __context,
  __dest,
  __doctype,
  __exported,
  __fragments,
  __functions,
  __handler,
  __media,
  __metadata,
  __routes,
  __scripts,
  __snippets,
  __src,
  __styles,
  __template
};
