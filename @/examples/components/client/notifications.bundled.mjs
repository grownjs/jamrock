// build/examples/components/client/notifications.generated.mjs
var __handler = async ($$props, __loader, self) => {
  const { useState, useEffect } = await __loader("jamrock");
  async function __context2(__default = {}) {
    let messages = [];
    messages = $$props.from ?? messages;
    ;
    const [msgs, setMsgs] = useState(messages);
    function close(offset) {
      setMsgs(msgs.filter((_, i) => i !== offset));
    }
    function pop() {
      if (!msgs.length) return;
      msgs.pop();
      setMsgs(msgs);
    }
    useEffect(() => {
      const t = setInterval(pop, 5e3);
      return () => clearInterval(t);
    }, []);
    return { __default, __scope: { from: messages, msgs, setMsgs, close, pop } };
  }
  const __runtime = await __loader("jamrock");
  const __self = __runtime.wrapComponent("examples/components/client/notifications.html", __context2, __template);
  return { __self, __context: __context2 };
};
var __routes = [];
var __snippets = {};
var __fragments = {};
var __scripts = [];
var __styles = [["examples/components/client/notifications.css", null]];
var __media = [];
var __context = "client";
var __doctype = async ($$, { from: messages, msgs, setMsgs, close, pop, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __metadata = async ($$, { from: messages, msgs, setMsgs, close, pop, ...$$props }) => [
  /*<![CDATA[*/
  /*]]>*/
];
var __attributes = async ($$, { from: messages, msgs, setMsgs, close, pop, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __template = async ($$, { from: messages, msgs, setMsgs, close, pop, ...$$props }) => [
  /*<![CDATA[*/
  /*!#25:1*/
  await $$.map(msgs, async (msg, i) => {
    return [
      ,
      /*!#26:3*/
      $$.e("li", {
        "class": (
          /*!#26:13*/
          msg.type
        ),
        "@location": "examples/components/client/notifications.html:26:3"
      }, [
        /*!#26:24*/
        $$.$(msg.value),
        " ",
        /*!#26:36*/
        $$.e("button", {
          "type": "button",
          "onclick": (
            /*!#26:67*/
            () => close(i)
          ),
          "@location": "examples/components/client/notifications.html:26:36"
        }, ["&times;"])
      ])
    ];
  })
  /*]]>*/
];
var __exported = ["from"];
var __functions = {};
var __src = "examples/components/client/notifications.html";
var __dest = "build/examples/components/client/notifications.generated.mjs";
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
