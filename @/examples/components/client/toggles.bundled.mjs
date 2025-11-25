// build/examples/components/client/toggles.generated.mjs
var __handler = async ($$props, __loader, self) => {
  const { useState, useEffect } = await __loader("jamrock");
  async function __context2(__default = {}) {
    const names = $$props.names ?? [];
    const prefix = $$props.prefix ?? "check-";
    const checked = $$props.checked ?? 0;
    const [focused, setFocus] = useState(null);
    const [selected, setTab] = useState(checked);
    function selectTab() {
      requestAnimationFrame(() => self.querySelector("[aria-selected=true] label").click());
    }
    function prevTab() {
      if (selected > 0) setTab(selected - 1);
    }
    function nextTab() {
      if (selected < names.length - 1) setTab(selected + 1);
    }
    function updateTab() {
      requestAnimationFrame(() => {
        const tabs = self.querySelectorAll("[role=tab]");
        const tab = self.querySelector("[role=tab]:focus");
        if (!tab) return;
        let offset = 0;
        for (let i = 0; i < tabs.length; i++) {
          if (tabs[i] === tab) break;
          offset++;
        }
        setTab(offset);
      });
    }
    let skip;
    function skipTabs(shift) {
      skip = true;
      setFocus(true);
      setTimeout(() => {
        skip = false;
      }, 60);
      const tabs = self.querySelectorAll("[role=tab]");
      if (shift) {
        tabs[0].focus();
      } else {
        tabs[tabs.length - 1].focus();
      }
    }
    function focusTabs() {
      if (skip || focused === null) return;
      setFocus(null);
      updateTab();
    }
    useEffect(() => {
      setTimeout(() => self.querySelector("[aria-selected=true]").focus(), 60);
    }, [selected]);
    __default = {
      prevTab,
      nextTab,
      updateTab,
      selectTab,
      skipTabs,
      focusTabs
    };
    return { __default, __scope: { names, prefix, checked, focused, setFocus, selected, setTab, selectTab, prevTab, nextTab, updateTab, skip, skipTabs, focusTabs } };
  }
  const __runtime = await __loader("jamrock");
  const __self = __runtime.wrapComponent("examples/components/client/toggles.html", __context2, __template);
  return { __self, __context: __context2 };
};
var __routes = [];
var __snippets = {};
var __fragments = {};
var __scripts = [];
var __styles = [["examples/components/client/toggles(0).css", []], ["examples/components/client/toggles.css", null]];
var __media = [];
var __context = "client";
var __doctype = async ($$, { names, prefix, checked, focused, setFocus, selected, setTab, selectTab, prevTab, nextTab, updateTab, skip, skipTabs, focusTabs, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __metadata = async ($$, { names, prefix, checked, focused, setFocus, selected, setTab, selectTab, prevTab, nextTab, updateTab, skip, skipTabs, focusTabs, ...$$props }) => [
  /*<![CDATA[*/
  /*]]>*/
];
var __attributes = async ($$, { names, prefix, checked, focused, setFocus, selected, setTab, selectTab, prevTab, nextTab, updateTab, skip, skipTabs, focusTabs, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __template = async ($$, { names, prefix, checked, focused, setFocus, selected, setTab, selectTab, prevTab, nextTab, updateTab, skip, skipTabs, focusTabs, ...$$props }) => [
  /*<![CDATA[*/
  /*!#81:1*/
  await $$.map(names, async (tab, i) => {
    return [
      ,
      /*!#82:1*/
      $$.e("li", {
        "aria-selected": (
          /*!#82:20*/
          selected === i ? "true" : null
        ),
        "role": "tab",
        "tabindex": "0",
        "@location": "examples/components/client/toggles.html:82:1",
        "class": "jam-x1rbgx2j"
      }, [
        /*!#83:3*/
        $$.e("label", {
          "for": (
            /*!#83:15*/
            prefix + /*!#83:23*/
            i
          ),
          "onclick": (
            /*!#83:38*/
            () => setTab(i)
          ),
          "@location": "examples/components/client/toggles.html:83:3"
        }, [
          /*!#83:57*/
          $$.$(tab)
        ])
      ])
    ];
  })
  /*]]>*/
];
var __exported = ["names", "prefix", "checked"];
var __functions = {};
var __src = "examples/components/client/toggles.html";
var __dest = "build/examples/components/client/toggles.generated.mjs";
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
