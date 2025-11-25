// build/examples/components/client/inspect.generated.mjs
var __handler = async ($$props, __loader, self) => {
  const { useState, useEffect } = await __loader("jamrock");
  async function __context2(__default = {}) {
    let data = $$props.data ?? [];
    let fields = $$props.fields;
    const main = $$props.main ?? null;
    const title = $$props.title ?? null;
    if (!fields) {
      data = !Array.isArray(data) ? Object.entries(data) : data;
    } else if (!Array.isArray(fields)) {
      fields = fields.split("|");
    }
    function value(object) {
      return typeof object === "object" ? JSON.stringify(object) : String(object);
    }
    const [{ filtered, query }, setState] = useState({ filtered: data, query: "" });
    let t;
    function filter(q) {
      clearTimeout(t);
      t = setTimeout(() => {
        setState({
          query: q,
          filtered: data.filter((item) => {
            const subject = JSON.stringify(item).toLowerCase();
            const filters = q.toLowerCase().split(/\s+/).filter(Boolean);
            return filters.every((_) => {
              if (_.includes(":")) return subject.includes(`"${_.split(":").join('":"')}"`);
              return subject.includes(_.toLowerCase());
            });
          })
        });
      }, 120);
    }
    useEffect(() => {
      const input = self?.querySelector("input");
      const q = input?.value;
      if (q && query !== q) filter(q);
    }, [query]);
    return { __default, __scope: { data, fields, main, title, value, filtered, query, setState, t, filter } };
  }
  const __runtime = await __loader("jamrock");
  const __self = __runtime.wrapComponent("examples/components/client/inspect.html", __context2, __template);
  return { __self, __context: __context2 };
};
var __routes = [];
var __snippets = {};
var __fragments = {};
var __scripts = [];
var __styles = [["examples/components/client/inspect(0).css", []], ["examples/components/client/inspect.css", null]];
var __media = [];
var __context = "client";
var __doctype = async ($$, { data, fields, main, title, value, filtered, query, setState, t, filter, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __metadata = async ($$, { data, fields, main, title, value, filtered, query, setState, t, filter, ...$$props }) => [
  /*<![CDATA[*/
  /*]]>*/
];
var __attributes = async ($$, { data, fields, main, title, value, filtered, query, setState, t, filter, ...$$props }) => ({
  /*<![CDATA[*/
  /*]]>*/
});
var __template = async ($$, { data, fields, main, title, value, filtered, query, setState, t, filter, ...$$props }) => [
  /*<![CDATA[*/
  /*!#90:1*/
  $$.e("h4", {
    "@location": "examples/components/client/inspect.html:90:1",
    "class": "jam-xs3mjva"
  }, [
    /*!#91:3*/
    $$.e("span", {
      "@location": "examples/components/client/inspect.html:91:3",
      "class": "jam-xs3mjva"
    }, [
      /*!#91:9*/
      $$.$(title),
      ":"
    ]),
    /*!#92:3*/
    $$.e("input", {
      "type": "search",
      "oninput": (
        /*!#92:33*/
        (e) => filter(e.target.value)
      ),
      "@location": "examples/components/client/inspect.html:92:3",
      "class": "jam-xs3mjva"
    }, [])
  ]),
  /*!#95:1*/
  $$.e("div", {
    "@location": "examples/components/client/inspect.html:95:1",
    "class": "jam-xs3mjva"
  }, [
    /*!#96:3*/
    $$.e("table", {
      "cellspacing": "0",
      "@location": "examples/components/client/inspect.html:96:3",
      "class": "jam-xs3mjva"
    }, [
      /*!#97:5*/
      $$.e("tbody", {
        "@location": "examples/components/client/inspect.html:97:5"
      }, [
        /*!#98:7*/
        await $$.map(filtered, async (item) => {
          return [
            ,
            /*!#99:9*/
            $$.e("tr", {
              "@location": "examples/components/client/inspect.html:99:9",
              "class": "jam-xs3mjva"
            }, [
              /*!#100:11*/
              await $$.map(fields, async (key) => {
                return [
                  ,
                  /*!#101:13*/
                  await $$.if(key === main, async () => {
                    return [
                      ,
                      /*!#102:15*/
                      $$.e("th", {
                        "align": "right",
                        "@location": "examples/components/client/inspect.html:102:15",
                        "class": "jam-xs3mjva"
                      }, [
                        /*!#102:33*/
                        $$.$(item[key])
                      ])
                      /*!#103:13*/
                    ];
                  }, async () => {
                    return [
                      ,
                      /*!#104:15*/
                      $$.e("td", {
                        "@location": "examples/components/client/inspect.html:104:15",
                        "class": "jam-xs3mjva"
                      }, [
                        /*!#104:19*/
                        $$.$(value(item[key]))
                      ])
                    ];
                  }),
                  ,
                  /*!#106:11*/
                ];
              }, async () => {
                return [
                  ,
                  /*!#107:13*/
                  $$.e("th", {
                    "align": "left",
                    "@location": "examples/components/client/inspect.html:107:13",
                    "class": "jam-xs3mjva"
                  }, [
                    /*!#107:30*/
                    $$.$(item[0])
                  ]),
                  /*!#108:13*/
                  $$.e("td", {
                    "@location": "examples/components/client/inspect.html:108:13",
                    "class": "jam-xs3mjva"
                  }, [
                    /*!#108:17*/
                    $$.$(value(item[1]))
                  ])
                ];
              })
            ])
          ];
        })
      ])
    ])
  ]),
  /*!#116:1*/
  $$.e("small", {
    "@location": "examples/components/client/inspect.html:116:1",
    "class": "jam-xs3mjva"
  }, [
    /*!#117:3*/
    $$.e("b", {
      "@location": "examples/components/client/inspect.html:117:3"
    }, [
      /*!#117:6*/
      $$.$(filtered.length)
    ]),
    " item",
    /*!#117:32*/
    $$.$(filtered.length === 1 ? "" : "s"),
    " found\n  ",
    /*!#118:3*/
    await $$.if(query.length > 0, async () => {
      return [
        ,
        '\n    containing "',
        /*!#119:17*/
        $$.$(query),
        '"\n  '
      ];
    })
  ])
  /*]]>*/
];
var __exported = ["data", "fields", "main", "title"];
var __functions = {};
var __src = "examples/components/client/inspect.html";
var __dest = "build/examples/components/client/inspect.generated.mjs";
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
